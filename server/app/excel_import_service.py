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

from collections import Counter, defaultdict
from decimal import Decimal
from typing import Any, Dict, Optional

from app import database


class ImportConflictError(Exception):
    """The project or location already exists."""


class ProjectNotFoundError(Exception):
    """The referenced project does not exist."""


# Excel sheet rows -> AGS child-table columns, in insert order. The guard
# below compares incoming rows against what is already stored, so the two
# column lists must stay aligned with the INSERTs in _insert_field_rows.
_ROW_MAP = (
    ("GEOL", "borelog",
     ("depth_from", "depth_to", "soil_description", "sand_clay"),
     ("GEOL_TOP", "GEOL_BASE", "GEOL_DESC", "GEOL_GEOL")),
    ("CORE", "rock_profile",
     ("depth_from", "depth_to", "recovery", "rqd", "remark"),
     ("CORE_TOP", "CORE_BASE", "CORE_PREC", "CORE_RQD", "CORE_REM")),
    ("ISPT", "spt",
     ("spt_depth", "blows_15", "blows_30", "blows_45", "n_value"),
     ("ISPT_TOP", "ISPT_INC1", "ISPT_INC2", "ISPT_INC3", "ISPT_NVAL")),
)


def _cell_key(value: Any) -> tuple:
    """One comparable key per cell so DB rows and workbook rows can be
    matched regardless of which side stored them.

    Numbers normalize through Decimal so 5.8, 5.80 and 5.800 all compare
    equal — NUMERIC keeps trailing zeros, the parsed sheet does not, and
    neither is a real difference. NULL sorts apart from any value.
    """
    if value is None:
        return ("null",)
    if isinstance(value, bool):
        return ("bool", value)
    if isinstance(value, (int, float, Decimal)):
        return ("num", str(Decimal(str(value)).normalize()))
    return ("text", str(value))


async def _find_duplicate_loca(
    connection, project_id: str, workbook: Dict[str, Any]
) -> Optional[str]:
    """Return the borehole id in this project already carrying exactly
    the workbook's field rows, if there is one.

    The unique constraints key on (PROJ_ID, LOCA_ID, depth), so the same
    sheet re-imported under a different borehole number inserts a full
    second copy of every layer, SPT blow and core run — the project ends
    up with two identical holes. Comparing the row multisets per table
    before writing catches that: the import is refused and the user is
    pointed at the borehole that already holds this data.
    """
    candidates: Optional[set] = None

    for table, sheet_key, in_cols, db_cols in _ROW_MAP:
        incoming = workbook.get(sheet_key) or []
        if not incoming:
            continue

        wanted = Counter(
            tuple(_cell_key(row.get(col)) for col in in_cols)
            for row in incoming
        )

        rows = await connection.fetch(
            'SELECT "LOCA_ID", '
            + ", ".join(f'"{col}"' for col in db_cols)
            + f' FROM "ags42"."{table}" WHERE "PROJ_ID" = $1',
            project_id,
        )
        by_loca: Dict[str, Counter] = defaultdict(Counter)
        for record in rows:
            by_loca[record["LOCA_ID"]][
                tuple(_cell_key(record[col]) for col in db_cols)
            ] += 1

        matches = {loca for loca, seen in by_loca.items() if seen == wanted}
        candidates = matches if candidates is None else candidates & matches

        if candidates is not None and not candidates:
            return None

    if not candidates:
        return None
    return min(candidates)



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

            duplicate_loca = await _find_duplicate_loca(
                connection, project_id, workbook
            )
            if duplicate_loca:
                raise ImportConflictError(
                    f"This workbook's rows are already stored under"
                    f" {duplicate_loca} in project {project_id}. Re-importing"
                    f" them as {borehole_id} would duplicate every layer,"
                    " SPT record and core run."
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
