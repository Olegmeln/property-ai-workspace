from app.models.schemas import Listing


def normalize_listing_results(listings: list[Listing], params: dict) -> list[Listing]:
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
