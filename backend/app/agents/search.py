from app.models.schemas import Listing, StructuredQuery


def search_mock_listings(query: StructuredQuery, params: dict) -> list[Listing]:
    limit = int(params.get("limit") or 8)
    districts = query.districts or ["Downtown", "Zilker", "Mueller"]
    base_lat, base_lng = 30.2672, -97.7431

    listings: list[Listing] = []
    for index in range(limit):
        district = districts[index % len(districts)]
        price = max(320_000, query.budget_max - index * 42_000)
        listings.append(
            Listing(
                id=f"mock-{index + 1}",
                title=f"{district} property {index + 1}",
                price=price,
                area=760 + index * 95,
                rooms=max(query.rooms_min, 1 + (index % 4)),
                district=district,
                lat=base_lat + (index - 4) * 0.013,
                lng=base_lng + (index - 3) * 0.017,
                score=round(92 - index * 4 + (index % 3) * 1.4, 1),
            )
        )
    return listings
