"""
Field Data database access.

GEOL, ISPT, and CORE all carry both "PROJ_ID" and "LOCA_ID" columns.
Every query in this module filters directly on BOTH columns on the table
being queried/written — never on "LOCA_ID" alone — so the same "LOCA_ID"
can safely exist under different projects without records leaking across
projects.

The confirmed column mapping (see app/schemas/field_data.py) is used
exactly as specified. Nothing here invents a database column or table
that was not part of that mapping.
"""

from decimal import Decimal

import asyncpg

from app import database


class DuplicateRecordError(Exception):
    """Raised when creating a record whose (PROJ_ID, LOCA_ID, top-depth)
    key already exists."""


async def loca_belongs_to_project(project_id: str, loca_id: str) -> bool:
    async with database.pool.acquire() as connection:
        row = await connection.fetchval(
            """
            SELECT 1
            FROM "ags42"."LOCA"
            WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2
            """,
            project_id,
            loca_id,
        )

    return row is not None


# ---------------------------------------------------------------------------
# Borehole / Drilling  (GEOL, with Average N value derived from ISPT)
# ---------------------------------------------------------------------------

async def get_borehole_records(project_id: str, loca_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                g."GEOL_TOP" AS depth_from,
                g."GEOL_BASE" AS depth_to,
                g."GEOL_DESC" AS soil_description,
                g."GEOL_GEOL" AS sand_clay,
                spt_avg."avg_n_value" AS avg_n_value
            FROM "ags42"."GEOL" g
            LEFT JOIN LATERAL (
                SELECT AVG(i."ISPT_NVAL") AS avg_n_value
                FROM "ags42"."ISPT" i
                WHERE i."PROJ_ID" = g."PROJ_ID"
                  AND i."LOCA_ID" = g."LOCA_ID"
                  AND i."ISPT_TOP" >= g."GEOL_TOP"
                  AND i."ISPT_TOP" < g."GEOL_BASE"
            ) spt_avg ON TRUE
            WHERE g."PROJ_ID" = $1
              AND g."LOCA_ID" = $2
            ORDER BY g."GEOL_TOP"
            """,
            project_id,
            loca_id,
        )

    return rows


async def create_borehole_record(
    project_id: str,
    loca_id: str,
    depth_from: Decimal,
    depth_to,
    soil_description,
    sand_clay,
):
    async with database.pool.acquire() as connection:
        existing = await connection.fetchval(
            """
            SELECT 1
            FROM "ags42"."GEOL"
            WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "GEOL_TOP" = $3
            """,
            project_id,
            loca_id,
            depth_from,
        )

        if existing:
            raise DuplicateRecordError(
                f"A borehole/drilling record already exists at depth {depth_from}."
            )

        try:
            row = await connection.fetchrow(
                """
                INSERT INTO "ags42"."GEOL"
                    ("PROJ_ID", "LOCA_ID", "GEOL_TOP", "GEOL_BASE", "GEOL_DESC", "GEOL_GEOL")
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING
                    "GEOL_TOP" AS depth_from,
                    "GEOL_BASE" AS depth_to,
                    "GEOL_DESC" AS soil_description,
                    "GEOL_GEOL" AS sand_clay
                """,
                project_id,
                loca_id,
                depth_from,
                depth_to,
                soil_description,
                sand_clay,
            )
        except asyncpg.UniqueViolationError as exc:
            raise DuplicateRecordError(
                f"A borehole/drilling record already exists at depth {depth_from}."
            ) from exc

    return row


async def update_borehole_record(
    project_id: str,
    loca_id: str,
    original_depth_from: Decimal,
    depth_from: Decimal,
    depth_to,
    soil_description,
    sand_clay,
):
    async with database.pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            UPDATE "ags42"."GEOL"
            SET
                "GEOL_TOP" = $4,
                "GEOL_BASE" = $5,
                "GEOL_DESC" = $6,
                "GEOL_GEOL" = $7
            WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "GEOL_TOP" = $3
            RETURNING
                "GEOL_TOP" AS depth_from,
                "GEOL_BASE" AS depth_to,
                "GEOL_DESC" AS soil_description,
                "GEOL_GEOL" AS sand_clay
            """,
            project_id,
            loca_id,
            original_depth_from,
            depth_from,
            depth_to,
            soil_description,
            sand_clay,
        )

    return row

async def delete_borehole_record(
    project_id: str,
    loca_id: str,
    depth_from: Decimal,
):
    async with database.pool.acquire() as connection:
        result = await connection.execute(
            """
            DELETE FROM "ags42"."GEOL"
            WHERE "PROJ_ID" = $1
              AND "LOCA_ID" = $2
              AND "GEOL_TOP" = $3
            """,
            project_id,
            loca_id,
            depth_from,
        )

    return result


# ---------------------------------------------------------------------------
# SPT (ISPT)
# ---------------------------------------------------------------------------

async def get_spt_records(project_id: str, loca_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                i."ISPT_TOP" AS spt_depth,
                i."ISPT_INC1" AS blows_15,
                i."ISPT_INC2" AS blows_30,
                i."ISPT_INC3" AS blows_45,
                i."ISPT_NVAL" AS n_value
            FROM "ags42"."ISPT" i
            WHERE i."PROJ_ID" = $1
              AND i."LOCA_ID" = $2
            ORDER BY i."ISPT_TOP"
            """,
            project_id,
            loca_id,
        )

    return rows


async def create_spt_record(
    project_id: str,
    loca_id: str,
    spt_depth: Decimal,
    blows_15,
    blows_30,
    blows_45,
    n_value,
):
    async with database.pool.acquire() as connection:
        existing = await connection.fetchval(
            """
            SELECT 1
            FROM "ags42"."ISPT"
            WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "ISPT_TOP" = $3
            """,
            project_id,
            loca_id,
            spt_depth,
        )

        if existing:
            raise DuplicateRecordError(
                f"An SPT record already exists at depth {spt_depth}."
            )

        try:
            row = await connection.fetchrow(
                """
                INSERT INTO "ags42"."ISPT"
                    ("PROJ_ID", "LOCA_ID", "ISPT_TOP", "ISPT_INC1", "ISPT_INC2", "ISPT_INC3", "ISPT_NVAL")
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    "ISPT_TOP" AS spt_depth,
                    "ISPT_INC1" AS blows_15,
                    "ISPT_INC2" AS blows_30,
                    "ISPT_INC3" AS blows_45,
                    "ISPT_NVAL" AS n_value
                """,
                project_id,
                loca_id,
                spt_depth,
                blows_15,
                blows_30,
                blows_45,
                n_value,
            )
        except asyncpg.UniqueViolationError as exc:
            raise DuplicateRecordError(
                f"An SPT record already exists at depth {spt_depth}."
            ) from exc

    return row


async def update_spt_record(
    project_id: str,
    loca_id: str,
    original_spt_depth: Decimal,
    spt_depth: Decimal,
    blows_15,
    blows_30,
    blows_45,
    n_value,
):
    async with database.pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            UPDATE "ags42"."ISPT"
            SET
                "ISPT_TOP" = $4,
                "ISPT_INC1" = $5,
                "ISPT_INC2" = $6,
                "ISPT_INC3" = $7,
                "ISPT_NVAL" = $8
            WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "ISPT_TOP" = $3
            RETURNING
                "ISPT_TOP" AS spt_depth,
                "ISPT_INC1" AS blows_15,
                "ISPT_INC2" AS blows_30,
                "ISPT_INC3" AS blows_45,
                "ISPT_NVAL" AS n_value
            """,
            project_id,
            loca_id,
            original_spt_depth,
            spt_depth,
            blows_15,
            blows_30,
            blows_45,
            n_value,
        )

    return row

async def delete_spt_record(
    project_id: str,
    loca_id: str,
    spt_depth: Decimal,
):
    async with database.pool.acquire() as connection:
        result = await connection.execute(
            """
            DELETE FROM "ags42"."ISPT"
            WHERE "PROJ_ID" = $1
              AND "LOCA_ID" = $2
              AND "ISPT_TOP" = $3
            """,
            project_id,
            loca_id,
            spt_depth,
        )

    return result

# ---------------------------------------------------------------------------
# Sampling / Coring (CORE, with Rock Description derived from GEOL)
# ---------------------------------------------------------------------------

async def _resolve_rock_description(connection, project_id: str, loca_id: str, depth_from: Decimal):
    """Look up the GEOL interval (if any) that overlaps depth_from, scoped
    by PROJ_ID + LOCA_ID. Returns (geol_top, geol_desc) or (None, None)."""

    geol_row = await connection.fetchrow(
        """
        SELECT g."GEOL_TOP", g."GEOL_DESC"
        FROM "ags42"."GEOL" g
        WHERE g."PROJ_ID" = $1
          AND g."LOCA_ID" = $2
          AND g."GEOL_TOP" <= $3
          AND g."GEOL_BASE" > $3
        ORDER BY g."GEOL_TOP"
        LIMIT 1
        """,
        project_id,
        loca_id,
        depth_from,
    )

    if geol_row is None:
        return None, None

    return geol_row["GEOL_TOP"], geol_row["GEOL_DESC"]


async def get_sampling_records(project_id: str, loca_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                c."CORE_TOP" AS depth_from,
                c."CORE_BASE" AS depth_to,
                geol_desc."GEOL_DESC" AS rock_description,
                c."CORE_PREC" AS recovery,
                c."CORE_RQD" AS rqd,
                c."CORE_REM" AS remark,
                sri."SAMPLE_ID" AS sample_id
            FROM "ags42"."CORE" c

            LEFT JOIN LATERAL (
                SELECT g."GEOL_DESC"
                FROM "ags42"."GEOL" g
                WHERE g."PROJ_ID" = c."PROJ_ID"
                  AND g."LOCA_ID" = c."LOCA_ID"
                  AND g."GEOL_TOP" <= c."CORE_TOP"
                  AND g."GEOL_BASE" > c."CORE_TOP"
                ORDER BY g."GEOL_TOP"
                LIMIT 1
            ) geol_desc ON TRUE

            LEFT JOIN "tdac"."SAMPLING_RECORD_ID" sri
                ON sri."PROJ_ID" = c."PROJ_ID"
                AND sri."LOCA_ID" = c."LOCA_ID"
                AND sri."DEPTH_FROM" = c."CORE_TOP"

            WHERE c."PROJ_ID" = $1
              AND c."LOCA_ID" = $2

            ORDER BY c."CORE_TOP"
            """,
            project_id,
            loca_id,
        )

    return rows


async def create_sampling_record(
    project_id: str,
    loca_id: str,
    depth_from: float,
    depth_to,
    recovery,
    rqd,
    remark,
):
    async with database.pool.acquire() as connection:
        async with connection.transaction():

            # ---------------------------------------------------------
            # Check for an existing sampling record at this depth
            # ---------------------------------------------------------
            existing = await connection.fetchval(
                """
                SELECT 1
                FROM "ags42"."CORE"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "CORE_TOP" = $3
                """,
                project_id,
                loca_id,
                depth_from,
            )

            if existing:
                raise DuplicateRecordError(
                    f"A sampling/coring record already exists at depth {depth_from}."
                )

            # ---------------------------------------------------------
            # Allocate the next Sample ID number for this project
            #
            # Example:
            # 301-1
            # 301-2
            #
            # A different project automatically starts at 1.
            # ---------------------------------------------------------
            counter_row = await connection.fetchrow(
                """
                INSERT INTO "tdac"."SAMPLE_ID_COUNTER"
                    ("PROJ_ID", "LAST_NUMBER")
                VALUES ($1, 1)
                ON CONFLICT ("PROJ_ID")
                DO UPDATE
                SET "LAST_NUMBER" =
                    "tdac"."SAMPLE_ID_COUNTER"."LAST_NUMBER" + 1
                RETURNING "LAST_NUMBER"
                """,
                project_id,
            )

            sample_number = counter_row["LAST_NUMBER"]

            sample_id = f"{project_id}-{sample_number}"

            # ---------------------------------------------------------
            # Insert the actual AGS CORE record
            # ---------------------------------------------------------
            try:
                row = await connection.fetchrow(
                    """
                    INSERT INTO "ags42"."CORE"
                        (
                            "PROJ_ID",
                            "LOCA_ID",
                            "CORE_TOP",
                            "CORE_BASE",
                            "CORE_PREC",
                            "CORE_RQD",
                            "CORE_REM"
                        )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING
                        "CORE_TOP" AS depth_from,
                        "CORE_BASE" AS depth_to,
                        "CORE_PREC" AS recovery,
                        "CORE_RQD" AS rqd,
                        "CORE_REM" AS remark
                    """,
                    project_id,
                    loca_id,
                    depth_from,
                    depth_to,
                    recovery,
                    rqd,
                    remark,
                )

            except asyncpg.UniqueViolationError as exc:
                raise DuplicateRecordError(
                    f"A sampling/coring record already exists at depth {depth_from}."
                ) from exc

            # ---------------------------------------------------------
            # Create the corresponding AGS SAMP record
            #
            # SAMP is the sample identity/linkage record.
            # Detailed geological information remains in GEOL.
            # ---------------------------------------------------------
            await connection.execute(
                """
                INSERT INTO "ags42"."SAMP"
                    (
                        "PROJ_ID",
                        "LOCA_ID",
                        "SAMP_ID",
                        "SAMP_TOP",
                        "SAMP_BASE"
                    )
                VALUES ($1, $2, $3, $4, $5)
                """,
                project_id,
                loca_id,
                sample_id,
                depth_from,
                depth_to,
            )

            # ---------------------------------------------------------
            # Get Rock Description from the matching geology interval
            # ---------------------------------------------------------
            _, rock_description = await _resolve_rock_description(
                connection,
                project_id,
                loca_id,
                depth_from,
            )

            # ---------------------------------------------------------
            # Store TDAC Sample ID against this sampling record
            # ---------------------------------------------------------
            await connection.execute(
                """
                INSERT INTO "tdac"."SAMPLING_RECORD_ID"
                    (
                        "SAMPLE_ID",
                        "PROJ_ID",
                        "LOCA_ID",
                        "DEPTH_FROM"
                    )
                VALUES ($1, $2, $3, $4)
                """,
                sample_id,
                project_id,
                loca_id,
                depth_from,
            )

            return {
                "sample_id": sample_id,
                "depth_from": row["depth_from"],
                "depth_to": row["depth_to"],
                "rock_description": rock_description,
                "recovery": row["recovery"],
                "rqd": row["rqd"],
                "remark": row["remark"],
            }


async def delete_sampling_record(
    project_id: str,
    loca_id: str,
    depth_from: Decimal,
):
    async with database.pool.acquire() as connection:
        async with connection.transaction():

            # ---------------------------------------------------------
            # Find the TDAC Sample ID for this sampling record
            # ---------------------------------------------------------
            sample_id = await connection.fetchval(
                """
                SELECT "SAMPLE_ID"
                FROM "tdac"."SAMPLING_RECORD_ID"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "DEPTH_FROM" = $3
                """,
                project_id,
                loca_id,
                depth_from,
            )

            if sample_id is None:
                return False

            # ---------------------------------------------------------
            # Do not delete a sample that already has laboratory tests
            # ---------------------------------------------------------
            lab_test_exists = await connection.fetchval(
                """
                SELECT 1
                FROM "lab"."test"
                WHERE "samp_id" = $1
                  AND "loca_id" = $2
                LIMIT 1
                """,
                sample_id,
                loca_id,
            )

            if lab_test_exists:
                raise ValueError(
                    f"Cannot delete sample {sample_id} because "
                    "laboratory tests already exist for this sample."
                )

            # ---------------------------------------------------------
            # Delete TDAC sample mapping
            # ---------------------------------------------------------
            await connection.execute(
                """
                DELETE FROM "tdac"."SAMPLING_RECORD_ID"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "DEPTH_FROM" = $3
                """,
                project_id,
                loca_id,
                depth_from,
            )

            # ---------------------------------------------------------
            # Delete AGS SAMP record
            # ---------------------------------------------------------
            await connection.execute(
                """
                DELETE FROM "ags42"."SAMP"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "SAMP_ID" = $3
                """,
                project_id,
                loca_id,
                sample_id,
            )

            # ---------------------------------------------------------
            # Delete AGS CORE record
            # ---------------------------------------------------------
            await connection.execute(
                """
                DELETE FROM "ags42"."CORE"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "CORE_TOP" = $3
                """,
                project_id,
                loca_id,
                depth_from,
            )

            return True

async def update_sampling_record(
    project_id: str,
    loca_id: str,
    original_depth_from: Decimal,
    depth_from: Decimal,
    depth_to,
    rock_description,
    recovery,
    rqd,
    remark,
):
    async with database.pool.acquire() as connection:
        async with connection.transaction():
            row = await connection.fetchrow(
                """
                UPDATE "ags42"."CORE"
                SET
                    "CORE_TOP" = $4,
                    "CORE_BASE" = $5,
                    "CORE_PREC" = $6,
                    "CORE_RQD" = $7,
                    "CORE_REM" = $8
                WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "CORE_TOP" = $3
                RETURNING
                    "CORE_TOP" AS depth_from,
                    "CORE_BASE" AS depth_to,
                    "CORE_PREC" AS recovery,
                    "CORE_RQD" AS rqd,
                    "CORE_REM" AS remark
                """,
                project_id,
                loca_id,
                original_depth_from,
                depth_from,
                depth_to,
                recovery,
                rqd,
                remark,
            )

            if row is None:
                return None

            # Rock Description is sourced from GEOL.GEOL_DESC, keyed off the
            # geology interval that overlaps the ORIGINAL sample depth (the
            # interval the value was read from when the record was fetched).
            geol_top, current_rock_desc = await _resolve_rock_description(
                connection, project_id, loca_id, original_depth_from
            )

            rock_desc_value = current_rock_desc

            if rock_description is not None and geol_top is not None:
                await connection.execute(
                    """
                    UPDATE "ags42"."GEOL"
                    SET "GEOL_DESC" = $4
                    WHERE "PROJ_ID" = $1 AND "LOCA_ID" = $2 AND "GEOL_TOP" = $3
                    """,
                    project_id,
                    loca_id,
                    geol_top,
                    rock_description,
                )
                rock_desc_value = rock_description

    return {
        "depth_from": row["depth_from"],
        "depth_to": row["depth_to"],
        "rock_description": rock_desc_value,
        "recovery": row["recovery"],
        "rqd": row["rqd"],
        "remark": row["remark"],
    }

async def get_project_samples(project_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                sri."SAMPLE_ID" AS sample_id,
                sri."LOCA_ID" AS loca_id,
                sri."DEPTH_FROM" AS depth_from,
                c."CORE_BASE" AS depth_to
            FROM "tdac"."SAMPLING_RECORD_ID" sri
            LEFT JOIN "ags42"."CORE" c
                ON c."PROJ_ID" = sri."PROJ_ID"
                AND c."LOCA_ID" = sri."LOCA_ID"
                AND c."CORE_TOP" = sri."DEPTH_FROM"
            WHERE sri."PROJ_ID" = $1
            ORDER BY
                sri."LOCA_ID",
                sri."DEPTH_FROM"
            """,
            project_id,
        )

    return rows

async def get_project_lab_tests(project_id: str):
    # lab.test has no project_id column - tests are linked to a project
    # through ags42."SAMP" (samp_id + loca_id), exactly like
    # lab_data_service.get_project_lab_tests. Joining on the pair also
    # keeps tests from other projects that happen to reuse a sample id
    # out of the result.
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                t."test_id",
                t."loca_id",
                t."samp_id",
                t."spec_ref",
                t."test_type",
                t."laboratory",
                t."technician",
                t."test_started_at",
                t."test_completed_at",
                t."status",
                t."current_revision",
                t."created_at"
            FROM "lab"."test" t
            INNER JOIN "ags42"."SAMP" s
                ON s."SAMP_ID" = t."samp_id"
               AND s."LOCA_ID" = t."loca_id"
            WHERE s."PROJ_ID" = $1
            ORDER BY
                t."created_at" DESC
            """,
            project_id,
        )

    return rows

async def get_project_sample_tests(project_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                s."SAMP_ID" AS sample_id,
                s."LOCA_ID" AS loca_id,
                t."test_id",
                t."test_type",
                t."status"
            FROM "ags42"."SAMP" s
            LEFT JOIN "lab"."test" t
                ON t."samp_id" = s."SAMP_ID"
                AND t."loca_id" = s."LOCA_ID"
            WHERE s."PROJ_ID" = $1
            ORDER BY
                s."LOCA_ID",
                s."SAMP_TOP",
                t."created_at"
            """,
            project_id,
        )

    return rows