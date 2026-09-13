# database.py
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
}

pool: asyncpg.Pool | None = None


async def connect_to_database():
    global pool

    pool = await asyncpg.create_pool(
        **DATABASE_CONFIG,
        min_size=1,
        max_size=10,
    )


async def close_database():
    global pool

    if pool:
        await pool.close()