from datetime import datetime
from uuid import UUID, uuid4

from app import database


async def create_lab_test(
    project_id: str,
    loca_id: str,
    samp_id: str,
    specimen_ref: str,
    test_type: str,
    method_definition_id: UUID,
    laboratory: str,
    technician: str | None,
    test_started_at: datetime | None,
    test_completed_at: datetime | None,
    created_by: str,
):
    async with database.pool.acquire() as connection:
        async with connection.transaction():
            # Get the project FILE_FSET
            project = await connection.fetchrow(
                """
                SELECT
                    "PROJ_ID",
                    "FILE_FSET"
                FROM "ags42"."PROJ"
                WHERE "PROJ_ID" = $1
                """,
                project_id,
            )

            if project is None:
                raise ValueError("Project does not exist.")

            # if not project["FILE_FSET"]:
            #     raise ValueError(
            #         "The project does not have a FILE_FSET."
            #     )

            # Get the selected sample and verify that it belongs
            # to the current project.
            sample = await connection.fetchrow(
                """
                SELECT
                    "PROJ_ID",
                    "LOCA_ID",
                    "SAMP_ID",
                    "SAMP_TOP",
                    "SAMP_REF",
                    "SAMP_TYPE",
                    "SAMP_BASE",
                    "FILE_FSET"
                FROM "ags42"."SAMP"
                WHERE "PROJ_ID" = $1
                  AND "LOCA_ID" = $2
                  AND "SAMP_ID" = $3
                """,
                project_id,
                loca_id,
                samp_id,
            )

            if sample is None:
                raise ValueError(
                    "The selected sample does not belong to this project."
                )

            # Verify the selected laboratory method exists.
            method = await connection.fetchrow(
                """
                SELECT
                    "method_definition_id",
                    "test_type",
                    "calculation_package",
                    "calculation_package_version"
                FROM "lab"."method_definition"
                WHERE "method_definition_id" = $1
                  AND "active" = true
                """,
                method_definition_id,
            )

            if method is None:
                raise ValueError(
                    "The selected laboratory method does not exist "
                    "or is inactive."
                )

            if method["test_type"] != test_type:
                raise ValueError(
                    "The selected method does not match the test type."
                )

            # Create the laboratory test.
            test_id = uuid4()

            row = await connection.fetchrow(
                """
                INSERT INTO "lab"."test" (
                    "test_id",
                    "file_fset",
                    "loca_id",
                    "samp_id",
                    "samp_top",
                    "samp_ref",
                    "samp_type",
                    "spec_ref",
                    "spec_depth",
                    "spec_base",
                    "test_type",
                    "method_definition_id",
                    "laboratory",
                    "technician",
                    "test_started_at",
                    "test_completed_at",
                    "source_type",
                    "status",
                    "current_revision",
                    "row_version",
                    "created_by",
                    "updated_by"
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    $7,
                    $8,
                    $9,
                    $10,
                    $11,
                    $12,
                    $13,
                    $14,
                    $15,
                    $16,
                    'MANUAL',
                    'DRAFT',
                    1,
                    1,
                    $17,
                    $17
                )
                RETURNING
                    "test_id",
                    "file_fset",
                    "loca_id",
                    "samp_id",
                    "samp_top",
                    "samp_ref",
                    "samp_type",
                    "spec_ref",
                    "spec_depth",
                    "spec_base",
                    "test_type",
                    "method_definition_id",
                    "laboratory",
                    "technician",
                    "test_started_at",
                    "test_completed_at",
                    "source_type",
                    "status",
                    "current_revision",
                    "row_version",
                    "created_at",
                    "created_by",
                    "updated_at",
                    "updated_by"
                """,
                test_id,
                sample["FILE_FSET"] or project["FILE_FSET"],
                sample["LOCA_ID"],
                sample["SAMP_ID"],
                sample["SAMP_TOP"],
                sample["SAMP_REF"],
                sample["SAMP_TYPE"],
                specimen_ref,
                sample["SAMP_TOP"],
                sample["SAMP_BASE"],
                test_type,
                method_definition_id,
                laboratory,
                technician,
                test_started_at,
                test_completed_at,
                created_by,
            )

            return row

async def get_project_lab_tests(project_id: str):
    async with database.pool.acquire() as connection:
        rows = await connection.fetch(
            """
            SELECT
                t."test_id",
                t."loca_id",
                t."samp_id",
                s."SAMP_TOP" AS samp_top,
                s."SAMP_BASE" AS samp_base,
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
               AND s."PROJ_ID" = $1
            WHERE t."samp_id" = s."SAMP_ID"
            ORDER BY t."created_at" DESC
            """,
            project_id,
        )

    return rows