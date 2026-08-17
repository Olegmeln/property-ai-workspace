"""
Bayut REST Search Agent.

Использует unofficial Bayut API через RapidAPI. Документация:
  https://rapidapi.com/apidojo/api/bayut/

Поведение:
  - Если RAPIDAPI_KEY не задан → возвращает пустой список и не падает.
  - Если задан, но запрос упал — пишет в лог, возвращает пустой список.
  - Успешный ответ нормализуется в RawListing.

Замечание про схему Bayut: ответ — это search-результат с полем `hits`,
каждый hit имеет поля price, area, rooms, location, coverPhoto и т.д.
Точная форма зависит от провайдера обёртки в RapidAPI — мы парсим
толерантно, через .get() с дефолтами.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.source_config import get_source_config
from app.models.schemas import RawListing

logger = logging.getLogger(__name__)


def search(
    params: dict[str, Any], target_count: int = 100, user_id: str | None = None
) -> list[RawListing]:
    """Главная точка входа агента."""
    config = get_source_config(user_id)
    if not config.rapidapi_key:
        logger.info("RAPIDAPI_KEY not set; bayut-rest agent skipped.")
        return []

    host = config.bayut_rapidapi_host
    url = f"https://{host}/properties/list"

    # Bayut'овский API пагинирует по hits_per_page; max обычно 25.
    page_size = max(1, min(25, int(params.get("hits_per_page") or 25)))
    pages_needed = (target_count + page_size - 1) // page_size

    headers = {
        "x-rapidapi-key": config.rapidapi_key,
        "x-rapidapi-host": host,
    }

    base_query = _build_query(params, page_size)
    listings: list[RawListing] = []

    with httpx.Client(timeout=20.0) as client:
        for page in range(pages_needed):
            q = {**base_query, "page": page}
            try:
                r = client.get(url, headers=headers, params=q)
                r.raise_for_status()
            except httpx.HTTPError as exc:
                logger.warning("Bayut request failed on page %s: %s", page, exc)
                break
            data = r.json()
            hits = data.get("hits") or data.get("results") or []
            if not hits:
                break
            for hit in hits:
                norm = _normalize(hit)
                if norm:
                    listings.append(norm)
                if len(listings) >= target_count:
                    return listings

    return listings


def _build_query(params: dict[str, Any], page_size: int) -> dict[str, Any]:
    """Маппим наши параметры на параметры Bayut endpoint'а."""
    q: dict[str, Any] = {
        "locationExternalIDs": "5002",  # Dubai по умолчанию (Bayut ID)
        "purpose": params.get("purpose", "for-sale"),
        "hitsPerPage": page_size,
        "lang": "en",
        "sort": "city-level-score",
    }
    if params.get("category"):
        q["categoryExternalID"] = _category_to_id(params["category"])
    if params.get("price_min") is not None:
        q["priceMin"] = params["price_min"]
    if params.get("price_max") is not None:
        q["priceMax"] = params["price_max"]
    if params.get("rooms_min") is not None:
        q["roomsMin"] = params["rooms_min"]
    if params.get("area_min") is not None:
        q["areaMin"] = params["area_min"]
    return q


def _category_to_id(category: str) -> int:
    """Bayut использует числовые ID категорий."""
    mapping = {
        "apartments": 4,
        "villas": 3,
        "townhouses": 16,
        "commercial": 18,
        "land": 14,
    }
    return mapping.get(category, 4)


def _normalize(hit: dict[str, Any]) -> RawListing | None:
    """Bayut → наш RawListing. Толерантно к отсутствию полей."""
    try:
        price = hit.get("price")
        if price is None:
            return None

        location = hit.get("location") or []
        # location — массив объектов от страны до района
        city = None
        district = None
        for loc in location:
            level = loc.get("level")
            name = loc.get("name")
            if level == 1:
                city = name
            elif level in (2, 3):
                district = district or name

        geo = hit.get("geography") or {}
        cover = hit.get("coverPhoto") or {}

        return RawListing(
            source="bayut-rest",
            external_id=str(hit.get("externalID") or hit.get("id") or ""),
            title=str(hit.get("title") or "Bayut listing"),
            url=f"https://www.bayut.com/property/details-{hit.get('externalID')}.html"
            if hit.get("externalID") else None,
            country="AE",
            city=city,
            district=district,
            lat=geo.get("lat"),
            lng=geo.get("lng"),
            price=float(price),
            currency="AED",  # Bayut всегда в дирхамах
            area_m2=float(hit["area"]) if hit.get("area") else None,
            rooms=float(hit["rooms"]) if hit.get("rooms") else None,
            property_kind=hit.get("category", [{}])[0].get("name") if hit.get("category") else None,
            photo_url=cover.get("url"),
            raw=hit,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to normalize Bayut hit: %s", exc)
        return None
