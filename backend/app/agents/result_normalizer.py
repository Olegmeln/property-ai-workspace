"""
Legacy normalizer: используется только старым фронтом через /normalize.
Новые агенты используют ranker (будет в следующем PR).
"""

from app.models.schemas import Listing, StructuredQuery


def normalize_listing_results(
    listings: list[Listing],
    params: dict,
    query: StructuredQuery | None = None,
) -> list[Listing]:
    _ = (params, query)  # пока не используем
    normalized = [
        Listing(
            **{
                **listing.model_dump(),
                "price": round(listing.price),
                "area": round(listing.area),
                "rooms": round(listing.rooms),
                "score": max(0, min(100, round(listing.score, 1))),
            }
        )
        for listing in listings
    ]
    return sorted(normalized, key=lambda item: item.score, reverse=True)
