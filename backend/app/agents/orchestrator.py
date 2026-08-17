"""
Search Orchestrator.

Принимает SearchStrategy, запускает каждый источник, объединяет результаты.
В MVP — последовательное выполнение. Параллелизм через asyncio.gather
добавим, когда подключим больше источников.

Дедупликация: по (source, external_id). Между источниками одинаковые
объявления почти не встречаются — у каждого свой identifier.
"""

from __future__ import annotations

import logging

from app.agents.sources import bayut, list_am
from app.models.schemas import RawListing, SearchStrategy

logger = logging.getLogger(__name__)


def execute(
    strategy: SearchStrategy, target_count: int = 100, user_id: str | None = None
) -> list[RawListing]:
    all_listings: list[RawListing] = []
    seen: set[tuple[str, str]] = set()

    for source_plan in strategy.sources:
        per_source_target = max(20, target_count // max(1, len(strategy.sources)) + 20)
        try:
            results = _run_source(source_plan.channel, source_plan.params, per_source_target, user_id)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Source %s failed: %s", source_plan.channel, exc)
            results = []

        for listing in results:
            key = (listing.source, listing.external_id)
            if key in seen:
                continue
            seen.add(key)
            all_listings.append(listing)

    return all_listings[:target_count]


def _run_source(channel: str, params: dict, target: int, user_id: str | None = None) -> list[RawListing]:
    if channel == "bayut-rest":
        return bayut.search(params, target_count=target, user_id=user_id)
    if channel == "list-am-browser":
        return list_am.search(params, target_count=target, user_id=user_id)
    # myhome-ge-browser — заглушка под следующий PR
    if channel == "myhome-ge-browser":
        logger.info("myhome-ge-browser not yet implemented")
        return []
    logger.warning("Unknown channel: %s", channel)
    return []
