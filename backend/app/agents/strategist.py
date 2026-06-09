"""
Strategist Agent.

По стране + типу сделки определяет, какие источники использовать. Это
не LLM-задача в чистом виде — карта «страна → источники» статична и
известна. LLM сюда подключается опционально, только чтобы человечно
объяснить выбор пользователю.

Правила:
  AE → bayut-rest (REST API через RapidAPI)
  AM → list-am-browser (HTML scraping)
  GE → myhome-ge-browser (HTML scraping)

В будущем тут будет fan-out на несколько источников одной страны.
"""

from __future__ import annotations

from app.models.schemas import RefinedQuery, SearchStrategy, SourcePlan


def strategize(query: RefinedQuery) -> SearchStrategy:
    sources: list[SourcePlan] = []
    rationale_parts: list[str] = []

    if query.country == "AE":
        sources.append(SourcePlan(
            channel="bayut-rest",
            weight=1.0,
            params={
                "purpose": "for-sale" if query.deal == "buy" else "for-rent",
                "category": _map_property_kind_to_bayut(query.property_kind),
                "price_max": query.budget_max,
                "price_min": query.budget_min,
                "rooms_min": query.rooms_min,
                "area_min": query.area_min_m2,
                "hits_per_page": min(query.target_count, 25),
            },
        ))
        rationale_parts.append(
            "Для ОАЭ используем REST API Bayut — это самый чистый канал с "
            "структурированными данными и стабильной схемой."
        )

    elif query.country == "AM":
        sources.append(SourcePlan(
            channel="list-am-browser",
            weight=1.0,
            params={
                "deal": query.deal,
                "city": query.city or "Yerevan",
                "districts": query.districts,
                "price_max": query.budget_max,
                "rooms_min": query.rooms_min,
            },
        ))
        rationale_parts.append(
            "В Армении публичного API нет — поднимаем browser-агента, который "
            "парсит list.am постранично."
        )

    elif query.country == "GE":
        sources.append(SourcePlan(
            channel="myhome-ge-browser",
            weight=1.0,
            params={
                "deal": query.deal,
                "city": query.city or "Tbilisi",
                "price_max": query.budget_max,
                "rooms_min": query.rooms_min,
            },
        ))
        rationale_parts.append(
            "В Грузии используем browser-агента по myhome.ge — публичного API нет."
        )

    return SearchStrategy(sources=sources, rationale=" ".join(rationale_parts))


def _map_property_kind_to_bayut(kind: str) -> str:
    """Маппинг наших категорий на категории Bayut."""
    mapping = {
        "apartment": "apartments",
        "house": "townhouses",
        "villa": "villas",
        "studio": "apartments",
        "commercial": "commercial",
        "land": "land",
        "any": "apartments",
    }
    return mapping.get(kind, "apartments")
