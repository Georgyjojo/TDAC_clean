"""
Excel import database access.

Both import flows land here (see app/excel_router.py):

  import_project_from_workbook -> PROJ + first LOCA + GEOL/CORE/ISPT rows
  import_loca_from_workbook    -> one extra LOCA + its GEOL/CORE/ISPT rows

Only values the application already reads are committed (see
schemas/field_data.py); the workbook's derived "thickness" / "layer average"
columns and styled empty padding rows are never stored.

  Borelog -> GEOL (GEOL_TOP, GEOL_BASE, GEOL_DESC, GEOL_GEOL)
  Rock    -> CORE (CORE_TOP, CORE_BASE, CORE_PREC, CORE_RQD, CORE_REM)
  SPT     -> ISPT (ISPT_TOP, ISPT_INC1..INC3, ISPT_NVAL)
  Info    -> PROJ (PROJ_LOC, PROJ_CLNT) + LOCA (LOCA_STAR, LOCA_ENDD,
             LOCA_FDEP, LOCA_TYPE)

Every child-table INSERT carries PROJ_ID because GEOL/CORE/ISPT enforce
NOT NULL PROJ_ID plus a composite foreign key to LOCA(PROJ_ID, LOCA_ID),
and each has a uniqueness constraint that makes ON CONFLICT DO NOTHING a
safe idempotent re-import. executemany batches each table into one network
round trip; a full input sheet is 3 statements, not 40+.
"""

from typing import Any, Dict

from app import database


class ImportConflictError(Exception):
    """The project or location already exists."""


class ProjectNotFoundError(Exception):
    """The referenced project does not exist."""


async def _insert_field_rows(connection, loca_id: str, project_id: str,
                             workbook: Dict[str, Any]) -> Dict[str, int]:
    """Insert GEOL/CORE/ISPT rows for one location. Returns row counts."""
    borelog = workbook.get("borelog", [])
    rock = workbook.get("rock_profile", [])
    spt = workbook.get("spt", [])

    if borelog:
        await connection.executemany(
            """
            INSERT INTO "ags42"."GEOL" (
                "PROJ_ID", "LOCA_ID", "GEOL_TOP", "GEOL_BASE",
                "GEOL_DESC", "GEOL_GEOL"
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
            """,
            [
                (
                    project_id, loca_id,
                    row["depth_from"], row["depth_to"],
                    row.get("soil_description"), row.get("sand_clay"),
                )
                for row in borelog
            ],
        )

    if rock:
        await connection.executemany(
            """
            INSERT INTO "ags42"."CORE" (
                "PROJ_ID", "LOCA_ID", "CORE_TOP", "CORE_BASE",
                "CORE_PREC", "CORE_RQD", "CORE_REM"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
            """,
            [
                (
                    project_id, loca_id,
                    row["depth_from"], row["depth_to"],
                    row.get("recovery"), row.get("rqd"), row.get("remark"),
                )
                for row in rock
            ],
        )

    if spt:
        await connection.executemany(
            """
            INSERT INTO "ags42"."ISPT" (
                "PROJ_ID", "LOCA_ID", "ISPT_TOP",
                "ISPT_INC1", "ISPT_INC2", "ISPT_INC3", "ISPT_NVAL"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT DO NOTHING
            """,
            [
                (
                    project_id, loca_id, row["spt_depth"],
                    row.get("blows_15"), row.get("blows_30"),
                    row.get("blows_45"), row.get("n_value"),
                )
                for row in spt
            ],
        )

    return {
        "geol_rows": len(borelog),
        "core_rows": len(rock),
        "spt_rows": len(spt),
    }


async def import_project_from_workbook(
    project_id: str,
    project_name: str,
    project_location,
    project_client,
    borehole_id: str,
    borehole_type: str,
    start_date,
    end_date,
    final_depth,
    workbook: Dict[str, Any],
) -> Dict[str, Any]:
    """Create a project + its first borehole + all field rows, atomically."""
    async with database.pool.acquire() as connection:
        async with connection.transaction():
            existing = await connection.fetchval(
                'SELECT 1 FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1',
                project_id,
            )
            if existing:
                raise ImportConflictError(
                    f"Project {project_id} already exists."
                )

            await connection.execute(
                """
                INSERT INTO "ags42"."PROJ" (
                    "PROJ_ID", "PROJ_NAME", "PROJ_LOC", "PROJ_CLNT"
                )
                VALUES ($1, $2, $3, $4)
                """,
                project_id, project_name, project_location, project_client,
            )

            await connection.execute(
                """
                INSERT INTO "ags42"."LOCA" (
                    "LOCA_ID", "LOCA_TYPE", "LOCA_STAR", "LOCA_ENDD",
                    "LOCA_FDEP", "PROJ_ID"
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                borehole_id, borehole_type, start_date, end_date,
                final_depth, project_id,
            )

            counts = await _insert_field_rows(
                connection, borehole_id, project_id, workbook
            )

    return {"project_id": project_id, "borehole_id": borehole_id, **counts}


async def import_loca_from_workbook(
    project_id: str,
    borehole_id: str,
    borehole_type: str,
    start_date,
    end_date,
    final_depth,
    workbook: Dict[str, Any],
) -> Dict[str, Any]:
    """Add one location + its field rows to an existing project, atomically."""
    async with database.pool.acquire() as connection:
        async with connection.transaction():
            project_exists = await connection.fetchval(
                'SELECT 1 FROM "ags42"."PROJ" WHERE "PROJ_ID" = $1',
                project_id,
            )
            if not project_exists:
                raise ProjectNotFoundError(
                    f"Project {project_id} does not exist."
                )

            loca_exists = await connection.fetchval(
                'SELECT 1 FROM "ags42"."LOCA"'
                ' WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2',
                project_id, borehole_id,
            )
            if loca_exists:
                raise ImportConflictError(
                    f"Location {borehole_id} already exists in project"
                    f" {project_id}."
                )

            await connection.execute(
                """
                INSERT INTO "ags42"."LOCA" (
                    "LOCA_ID", "LOCA_TYPE", "LOCA_STAR", "LOCA_ENDD",
                    "LOCA_FDEP", "PROJ_ID"
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                borehole_id, borehole_type, start_date, end_date,
                final_depth, project_id,
            )

            counts = await _insert_field_rows(
                connection, borehole_id, project_id, workbook
            )

    return {"project_id": project_id, "borehole_id": borehole_id, **counts}
