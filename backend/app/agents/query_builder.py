import re

from app.models.schemas import StructuredQuery


def build_structured_query(text: str, params: dict) -> StructuredQuery:
    city = str(params.get("city") or _extract_city(text) or "Austin")
    budget_max = int(params.get("budget_max") or _extract_budget(text) or 850_000)
    rooms_min = int(params.get("rooms_min") or _extract_rooms(text) or 2)
    raw_districts = params.get("districts") or ["Downtown", "Zilker", "Mueller"]
    districts = [str(item).strip() for item in raw_districts if str(item).strip()]

    return StructuredQuery(
        city=city,
        budget_max=budget_max,
        rooms_min=rooms_min,
        districts=districts,
    )


def _extract_budget(text: str) -> int | None:
    match = re.search(r"\$?\s?(\d+(?:\.\d+)?)\s?(m|million|k)?", text, re.IGNORECASE)
    if not match:
        return None
    value = float(match.group(1))
    unit = (match.group(2) or "").lower()
    if unit in {"m", "million"}:
        return int(value * 1_000_000)
    if unit == "k":
        return int(value * 1_000)
    return int(value) if value > 10_000 else None


def _extract_rooms(text: str) -> int | None:
    match = re.search(r"(\d+)\s?(bed|beds|br|room|rooms)", text, re.IGNORECASE)
    return int(match.group(1)) if match else None


def _extract_city(text: str) -> str | None:
    match = re.search(r"\bin\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)", text)
    return match.group(1) if match else None
