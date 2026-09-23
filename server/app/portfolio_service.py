from app import database
from datetime import date

async def get_portfolio_summary():
    async with database.pool.acquire() as connection:
        total_projects = await connection.fetchval(
            """
            SELECT COUNT(*)
            FROM "ags42"."PROJ"
            """
        )

        projects = await connection.fetch(
            """
            SELECT
                p."PROJ_ID",
                p."PROJ_NAME",
                p."PROJ_LOC",
                p."PROJ_CLNT",
                m."PROJECT_TYPE",
                m."ISSUE_STATUS",
                m."REPORT_DATE",
                (
                    SELECT COUNT(*)
                    FROM "ags42"."LOCA" l
                    WHERE l."PROJ_ID" = p."PROJ_ID"
                ) AS "LOCA_COUNT",
                (
                    SELECT COUNT(*)
                    FROM "ags42"."SAMP" s
                    WHERE s."PROJ_ID" = p."PROJ_ID"
                ) AS "SAMP_COUNT",
                (
                    SELECT COUNT(*)
                    FROM "lab"."test" t
                    JOIN "ags42"."SAMP" s2 ON s2."SAMP_ID" = t."samp_id"
                    WHERE s2."PROJ_ID" = p."PROJ_ID"
                ) AS "TEST_COUNT",
                (
                    SELECT COUNT(*)
                    FROM "lab"."test" t
                    JOIN "ags42"."SAMP" s3 ON s3."SAMP_ID" = t."samp_id"
                    WHERE s3."PROJ_ID" = p."PROJ_ID"
                      AND t."status" = 'PUBLISHED'
                ) AS "PUBLISHED_COUNT"
            FROM "ags42"."PROJ" p
            LEFT JOIN "tdac"."PROJ_METADATA" m
                ON m."PROJ_ID" = p."PROJ_ID"
            ORDER BY p."PROJ_ID"
            """
        )

    return {
        "total_projects": total_projects,
        "projects": projects,
    }

async def get_project_id_preview() -> str:
    today = date.today()
    year = today.year
    month = today.month

    async with database.pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            SELECT "LAST_NUMBER"
            FROM "tdac"."PROJECT_ID_COUNTER"
            WHERE "YEAR" = $1
              AND "MONTH" = $2
            """,
            year,
            month,
        )

    next_number = (row["LAST_NUMBER"] + 1) if row else 1

    return f"TDAC-{year:04d}-{month:02d}-{next_number}"

async def allocate_project_id() -> str:
    today = date.today()
    year = today.year
    month = today.month

    async with database.pool.acquire() as connection:
        row = await connection.fetchrow(
            """
            INSERT INTO "tdac"."PROJECT_ID_COUNTER"
                ("YEAR", "MONTH", "LAST_NUMBER")
            VALUES ($1, $2, 1)
            ON CONFLICT ("YEAR", "MONTH")
            DO UPDATE
            SET "LAST_NUMBER" =
                "tdac"."PROJECT_ID_COUNTER"."LAST_NUMBER" + 1
            RETURNING "LAST_NUMBER"
            """,
            year,
            month,
        )

    return f"TDAC-{year:04d}-{month:02d}-{row['LAST_NUMBER']}"

async def get_project(project_id: str):
    async with database.pool.acquire() as connection:
        project = await connection.fetchrow(
            """
            SELECT
                p."PROJ_ID",
                p."PROJ_NAME",
                p."PROJ_LOC",
                p."PROJ_CLNT",
                p."PROJ_ENG",
                p."PROJ_CONT",
                pm."PROJECT_TYPE"
            FROM "ags42"."PROJ" p
            LEFT JOIN "tdac"."PROJ_METADATA" pm
                ON pm."PROJ_ID" = p."PROJ_ID"
            WHERE p."PROJ_ID" = $1
            """,
            project_id,
        )

    return project

async def update_project(
    project_id: str,
    project_name: str,
    project_location: str,
    project_client: str,
):
    async with database.pool.acquire() as connection:
        project = await connection.fetchrow(
            """
            UPDATE "ags42"."PROJ"
            SET
                "PROJ_NAME" = $2,
                "PROJ_LOC" = $3,
                "PROJ_CLNT" = $4
            WHERE "PROJ_ID" = $1
            RETURNING
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT"
            """,
            project_id,
            project_name,
            project_location,
            project_client,
        )

    return project

async def create_project(
    project_number: str,
    project_name: str,
    country_region: str,
    client: str,
    consultant_name: str,
    contractor_name: str,
):
    async with database.pool.acquire() as connection:
        project = await connection.fetchrow(
            """
            INSERT INTO "ags42"."PROJ" (
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT",
                "PROJ_ENG",
                "PROJ_CONT"
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT",
                "PROJ_ENG",
                "PROJ_CONT"
            """,
            project_number,
            project_name,
            country_region,
            client,
            consultant_name,
            contractor_name
        )

    return project

async def get_project_locas(project_id: str):
    async with database.pool.acquire() as connection:
        locas = await connection.fetch(
            """
            SELECT
                "LOCA_ID",
                "LOCA_TYPE",
                "LOCA_FDEP",
                "LOCA_STAR",
                "LOCA_ENDD",
                "PROJ_ID"
            FROM "ags42"."LOCA"
            WHERE "PROJ_ID" = $1
            ORDER BY "LOCA_ID"
            """,
            project_id,
        )

    return locas

async def create_project_loca(
    project_id: str,
    loca_id: str,
    loca_type: str,
    start_date,
    end_date,
    final_depth,
):
    async with database.pool.acquire() as connection:
        loca = await connection.fetchrow(
            """
            INSERT INTO "ags42"."LOCA" (
                "LOCA_ID",
                "LOCA_TYPE",
                "LOCA_STAR",
                "LOCA_ENDD",
                "LOCA_FDEP",
                "PROJ_ID"
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                "LOCA_ID",
                "LOCA_TYPE",
                "LOCA_FDEP",
                "LOCA_STAR",
                "LOCA_ENDD",
                "PROJ_ID"
            """,
            loca_id,
            loca_type,
            start_date,
            end_date,
            final_depth,
            project_id,
        )

    return loca

async def create_project_metadata(
    project_id: str,
    road_reference: str | None = None,
    chainage_text: str | None = None,
    structure_reference: str | None = None,
    selected_boreholes: str | None = None,
    project_type: str | None = None,
    report_type: str | None = None,
    report_title: str | None = None,
    report_volume_title: str | None = None,
    document_reference: str | None = None,
    revision: str | None = None,
    report_date=None,
    issue_status: str | None = None,
    tdac_company_name: str | None = None,
    groundwater_basis: str | None = None,
    design_standard_basis: str | None = None,
    factor_of_safety_basis: str | None = None,
    load_combination_basis: str | None = None,
    construction_verification_requirement: str | None = None,
    pile_load_test_requirement: str | None = None,
):
    async with database.pool.acquire() as connection:
        metadata = await connection.fetchrow(
            """
            INSERT INTO "tdac"."PROJ_METADATA" (
                "PROJ_ID",
                "ROAD_REFERENCE",
                "CHAINAGE_TEXT",
                "STRUCTURE_REFERENCE",
                "SELECTED_BOREHOLES",
                "PROJECT_TYPE",
                "REPORT_TYPE",
                "REPORT_TITLE",
                "REPORT_VOLUME_TITLE",
                "DOCUMENT_REFERENCE",
                "REVISION",
                "REPORT_DATE",
                "ISSUE_STATUS",
                "TDAC_COMPANY_NAME",
                "GROUNDWATER_BASIS",
                "DESIGN_STANDARD_BASIS",
                "FACTOR_OF_SAFETY_BASIS",
                "LOAD_COMBINATION_BASIS",
                "CONSTRUCTION_VERIFICATION_REQUIREMENT",
                "PILE_LOAD_TEST_REQUIREMENT"
            )
            VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20
            )
            RETURNING
                "PROJ_ID",
                "ROAD_REFERENCE",
                "CHAINAGE_TEXT",
                "STRUCTURE_REFERENCE",
                "SELECTED_BOREHOLES",
                "PROJECT_TYPE",
                "REPORT_TYPE",
                "REPORT_TITLE",
                "REPORT_VOLUME_TITLE",
                "DOCUMENT_REFERENCE",
                "REVISION",
                "REPORT_DATE",
                "ISSUE_STATUS",
                "TDAC_COMPANY_NAME",
                "GROUNDWATER_BASIS",
                "DESIGN_STANDARD_BASIS",
                "FACTOR_OF_SAFETY_BASIS",
                "LOAD_COMBINATION_BASIS",
                "CONSTRUCTION_VERIFICATION_REQUIREMENT",
                "PILE_LOAD_TEST_REQUIREMENT"
            """,
            project_id,
            road_reference,
            chainage_text,
            structure_reference,
            selected_boreholes,
            project_type,
            report_type,
            report_title,
            report_volume_title,
            document_reference,
            revision,
            report_date,
            issue_status,
            tdac_company_name,
            groundwater_basis,
            design_standard_basis,
            factor_of_safety_basis,
            load_combination_basis,
            construction_verification_requirement,
            pile_load_test_requirement,

        )
    return metadata

async def get_project_metadata(project_id: str):
    async with database.pool.acquire() as connection:
        metadata = await connection.fetchrow(
            """
            SELECT
                "PROJ_ID" AS proj_id,
                "ROAD_REFERENCE" AS road_reference,
                "CHAINAGE_TEXT" AS chainage_text,
                "STRUCTURE_REFERENCE" AS structure_reference,
                "SELECTED_BOREHOLES" AS selected_boreholes,
                "REPORT_TYPE" AS report_type,
                "REPORT_TITLE" AS report_title,
                "REPORT_VOLUME_TITLE" AS report_volume_title,
                "DOCUMENT_REFERENCE" AS document_reference,
                "REVISION" AS revision,
                "REPORT_DATE" AS report_date,
                "ISSUE_STATUS" AS issue_status,
                "TDAC_COMPANY_NAME" AS tdac_company_name,
                "GROUNDWATER_BASIS" AS groundwater_basis,
                "DESIGN_STANDARD_BASIS" AS design_standard_basis,
                "FACTOR_OF_SAFETY_BASIS" AS factor_of_safety_basis,
                "LOAD_COMBINATION_BASIS" AS load_combination_basis,
                "CONSTRUCTION_VERIFICATION_REQUIREMENT" AS construction_verification_requirement,
                "PILE_LOAD_TEST_REQUIREMENT" AS pile_load_test_requirement
            FROM "tdac"."PROJ_METADATA"
            WHERE "PROJ_ID" = $1
            """,
            project_id,
        )

    return metadata

async def update_project_overview(
    project_id: str,
    project_name: str,
    project_location: str,
    project_client: str,
    consultant_name: str,
    contractor_name: str,
    road_reference: str,
    chainage_text: str,
    structure_reference: str,
    selected_boreholes: str,
    report_type: str,
    report_title: str,
    report_volume_title: str,
    document_reference: str,
    revision: str,
    report_date,
    issue_status: str,
    tdac_company_name: str,
    groundwater_basis: str,
    design_standard_basis: str = "",
    factor_of_safety_basis: str = "",
    load_combination_basis: str = "",
    construction_verification_requirement: str = "",
    pile_load_test_requirement: str = "",
):
    async with database.pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                """
                UPDATE "ags42"."PROJ"
                SET
                    "PROJ_NAME" = $1,
                    "PROJ_LOC" = $2,
                    "PROJ_CLNT" = $3,
                    "PROJ_ENG" = $4,
                    "PROJ_CONT" = $5
                WHERE "PROJ_ID" = $6
                """,
                project_name,
                project_location,
                project_client,
                consultant_name,
                contractor_name,
                project_id,
            )

            await connection.execute(
                """
                UPDATE "tdac"."PROJ_METADATA"
                SET
                    "ROAD_REFERENCE" = $1,
                    "CHAINAGE_TEXT" = $2,
                    "STRUCTURE_REFERENCE" = $3,
                    "SELECTED_BOREHOLES" = $4,
                    "REPORT_TYPE" = $5,
                    "REPORT_TITLE" = $6,
                    "REPORT_VOLUME_TITLE" = $7,
                    "DOCUMENT_REFERENCE" = $8,
                    "REVISION" = $9,
                    "REPORT_DATE" = $10,
                    "ISSUE_STATUS" = $11,
                    "TDAC_COMPANY_NAME" = $12,
                    "GROUNDWATER_BASIS" = $13,
                    "DESIGN_STANDARD_BASIS" = $14,
                    "FACTOR_OF_SAFETY_BASIS" = $15,
                    "LOAD_COMBINATION_BASIS" = $16,
                    "CONSTRUCTION_VERIFICATION_REQUIREMENT" = $17,
                    "PILE_LOAD_TEST_REQUIREMENT" = $18
                WHERE "PROJ_ID" = $19
                """,
                road_reference,
                chainage_text,
                structure_reference,
                selected_boreholes,
                report_type,
                report_title,
                report_volume_title,
                document_reference,
                revision,
                report_date,
                issue_status,
                tdac_company_name,
                groundwater_basis,
                design_standard_basis,
                factor_of_safety_basis,
                load_combination_basis,
                construction_verification_requirement,
                pile_load_test_requirement,
                project_id,
            )

        project = await connection.fetchrow(
            """
            SELECT
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT",
                "PROJ_ENG",
                "PROJ_CONT"
            FROM "ags42"."PROJ"
            WHERE "PROJ_ID" = $1
            """,
            project_id,
        )

    return project