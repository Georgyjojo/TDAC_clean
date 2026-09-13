from app import database


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
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT"
            FROM "ags42"."PROJ"
            ORDER BY "PROJ_ID"
            """
        )

    return {
        "total_projects": total_projects,
        "projects": projects,
    }

async def get_project(project_id: str):
    async with database.pool.acquire() as connection:
        project = await connection.fetchrow(
            """
            SELECT
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT"
            FROM "ags42"."PROJ"
            WHERE "PROJ_ID" = $1
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
):
    async with database.pool.acquire() as connection:
        project = await connection.fetchrow(
            """
            INSERT INTO "ags42"."PROJ" (
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT"
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                "PROJ_ID",
                "PROJ_NAME",
                "PROJ_LOC",
                "PROJ_CLNT"
            """,
            project_number,
            project_name,
            country_region,
            client,
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