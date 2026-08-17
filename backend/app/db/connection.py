"""
Тонкий слой поверх psycopg3 — без ORM (см. Global Constraints плана).
"""

from __future__ import annotations

from pathlib import Path

import psycopg

from app.core.settings import get_settings

_SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def get_connection() -> psycopg.Connection:
    settings = get_settings()
    if not settings.database_url:
        raise RuntimeError("DATABASE_URL is not set; cannot open a database connection.")
    return psycopg.connect(settings.database_url)


def init_schema(conn: psycopg.Connection) -> None:
    sql = _SCHEMA_PATH.read_text(encoding="utf-8")
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
