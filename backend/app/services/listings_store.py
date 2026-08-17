"""
Чтение/запись кэша листингов и истории поисков. Тонкая обёртка над
psycopg3 — без ORM, консистентно с app/db/connection.py.
"""

from __future__ import annotations

import json
from typing import Any

import psycopg


def get_cached(
    conn: psycopg.Connection, source: str, external_id: str, max_age_seconds: int
) -> dict[str, Any] | None:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT payload FROM listings_cache
            WHERE source = %s AND external_id = %s
              AND fetched_at > now() - make_interval(secs => %s)
            """,
            (source, external_id, max_age_seconds),
        )
        row = cur.fetchone()

    return row[0] if row else None


def upsert_listings(conn: psycopg.Connection, listings: list[dict[str, Any]]) -> None:
    with conn.cursor() as cur:
        for listing in listings:
            cur.execute(
                """
                INSERT INTO listings_cache (source, external_id, payload, fetched_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (source, external_id)
                DO UPDATE SET payload = EXCLUDED.payload, fetched_at = now()
                """,
                (listing["source"], listing["external_id"], json.dumps(listing)),
            )
    conn.commit()


def record_search(conn: psycopg.Connection, user_id: str | None, query: dict[str, Any], result_count: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO search_history (user_id, query, result_count) VALUES (%s, %s, %s)",
            (user_id, json.dumps(query), result_count),
        )
    conn.commit()
