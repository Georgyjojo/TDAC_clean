from contextlib import asynccontextmanager
import app.database as database
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.database import (
    connect_to_database, 
    close_database,
    pool,
    )

from app.auth.security import hash_password
from app.schemas.project import ProjectCreate
# Router
from app.auth.router import router as auth_router
from app.portfolio_router import router as portfolio_router
from app.field_data_router import router as field_data_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Connecting to database...")
    await database.connect_to_database()
    print("Database connected.")
    yield
    print("Closing database connection...")
    await database.close_database()
    print("Database connection closed.")

app = FastAPI(lifespan=lifespan)
app.include_router(portfolio_router)
app.include_router(field_data_router)
app.include_router(auth_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def root():
    return{
        "message":"Tdac api is running"
    }

@app.get('/api/testdb')
async def test_database():
    async with database.pool.acquire() as connection:
        result = await connection.fetchval(
            "SELECT NOW()"
        )

        return {
            "message":"Database connected",
            "time": result
        }

@app.get('/api/test-schemas')
async def test_schema():
    async with database.pool.acquire() as connection:
        schemas = await connection.fetch(
            """
            SELECT schema_name 
            FROM information_schema.schemata
            ORDER BY schema_name
            """
        )

    return {
        "schemas":[
            row["schema_name"]
            for row in schemas
        ]
    }

@app.get('/api/test-tables')
async def test_tables():
    async with database.pool.acquire() as connection:
        tables = await connection.fetch(
            """
            SELECT
                table_schema,
                table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name
            """
        )
        print("TABLES FROM DATABASE")
        print(tables)

    return {
        "tables":[
            {
                "schema":row["table_schema"],
                "table":row["table_name"]
            }
            for row in tables
        ]        
    }

@app.get('/api/test-user')
async def test_user():
    async with database.pool.acquire() as connection:
        columns =  await connection.fetch(
            """
                SELECT 
                    column_name,
                    data_type,
                    is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'tdac'
                AND table_name = 'users'
                ORDER BY ordinal_position
            """
        )
    return {
        "columns":[
            {
                "name":row["column_name"],
                "type": row['data_type'],
                "nullable": row["is_nullable"]
            }
            for row in columns
        ]
    }

@app.get('/api/test-role')
async def get_role():
    async with database.pool.acquire() as connection:
        columns = await connection.fetch(
            """
                SELECT
                column_name,
                data_type,
                is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'tdac'
                AND table_name = 'roles'
                ORDER BY ordinal_position
            """
        )
    return {
        "columns":[
            {
                "name":row["column_name"],
                "type":row["data_type"],
                "nullable":row["is_nullable"]
            }
            for row in columns
        ]
    }

@app.get("/api/test-password")
async def test_password():

    password = "test123"

    hashed = hash_password(password)

    return {
        "password": password,
        "hashed_password": hashed
    }

@app.post("/api/projects")
async def create_project(data: ProjectCreate):
    # Validate drilling dates
    if data.end_date < data.start_date:
        raise HTTPException(
            status_code=400,
            detail="Drilling end date cannot be before start date",
        )

    async with database.pool.acquire() as connection:
        try:
            async with connection.transaction():

                # -----------------------------------------
                # 1. INSERT PROJECT INTO PROJ
                # -----------------------------------------

                await connection.execute(
                    """
                    INSERT INTO "ags42"."PROJ"
                    (
                        "PROJ_ID",
                        "PROJ_NAME",
                        "PROJ_LOC",
                        "PROJ_CLNT"
                    )
                    VALUES ($1, $2, $3, $4)
                    """,
                    data.project_id,
                    data.project_name,
                    data.project_location,
                    data.project_client,
                )

                # -----------------------------------------
                # 2. INSERT BOREHOLE INTO LOCA
                # -----------------------------------------

                await connection.execute(
                    """
                    INSERT INTO "ags42"."LOCA"
                    (
                        "LOCA_ID",
                        "LOCA_TYPE",
                        "LOCA_STAR",
                        "LOCA_ENDD",
                        "LOCA_FDEP",
                        "PROJ_ID"
                    )
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    data.borehole_id,
                    data.borehole_type,
                    data.start_date,
                    data.end_date,
                    data.final_depth,
                    data.project_id,
                )

        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Unable to create project: {str(exc)}",
            ) from exc

    return {
        "message": "Project created successfully",
        "project_id": data.project_id,
        "borehole_id": data.borehole_id,
    }