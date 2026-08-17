import os

import pytest

from app.db.connection import get_connection, init_schema
from app.services.listings_store import get_cached, record_search, upsert_listings

requires_database = pytest.mark.skipif(
    not os.getenv("DATABASE_URL"),
    reason="DATABASE_URL not set; start backend/docker-compose.yml postgres service to run this test",
)


@pytest.fixture()
def conn():
    connection = get_connection()
    init_schema(connection)
    with connection.cursor() as cur:
        cur.execute("TRUNCATE listings_cache, search_history")
    connection.commit()
    yield connection
    connection.close()


@requires_database
def test_upsert_then_get_cached_round_trips(conn):
    upsert_listings(conn, [{"source": "list-am-browser", "external_id": "1", "title": "Test"}])

    cached = get_cached(conn, "list-am-browser", "1", max_age_seconds=3600)

    assert cached is not None
    assert cached["title"] == "Test"


@requires_database
def test_get_cached_returns_none_when_missing(conn):
    assert get_cached(conn, "list-am-browser", "does-not-exist", max_age_seconds=3600) is None


@requires_database
def test_record_search_inserts_a_row(conn):
    record_search(conn, user_id=None, query={"city": "Yerevan"}, result_count=5)

    with conn.cursor() as cur:
        cur.execute("SELECT result_count FROM search_history")
        row = cur.fetchone()

    assert row[0] == 5
