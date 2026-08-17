import os

import pytest

from app.db.connection import get_connection, init_schema

requires_database = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set; start backend/docker-compose.yml postgres service to run this test",
)


@requires_database
def test_init_schema_creates_expected_tables():
    conn = get_connection()
    init_schema(conn)

    with conn.cursor() as cur:
        cur.execute(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        )
        tables = {row[0] for row in cur.fetchall()}

    assert "listings_cache" in tables
    assert "search_history" in tables
    conn.close()


def test_get_connection_raises_clear_error_when_database_url_unset(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    from app.core.settings import get_settings
    get_settings.cache_clear()

    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        get_connection()
