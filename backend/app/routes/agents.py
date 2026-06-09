"""
HTTP-маршруты агентов.

Новые ручки (используем для платформы):
  POST /refine       — Refiner Agent
  POST /strategize   — Strategist Agent
  POST /search       — Orchestrator: strategize → execute → return listings

Legacy ручки (для совместимости с уже задеплоенным фронтом):
  POST /query
  POST /search-legacy
  POST /normalize
  GET  /health/llm

Legacy /search переименован в /search-legacy чтобы не конфликтовать с
новым /search. Старый фронт всё равно ходит через fallback при недоступности,
поэтому breaking change тут терпим.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.agents import orchestrator
from app.agents.query_builder import build_structured_query
from app.agents.refiner import refine_query
from app.agents.result_normalizer import normalize_listing_results
from app.agents.search import search_mock_listings
from app.agents.strategist import strategize
from app.models.schemas import (
    LegacySearchRequest,
    NormalizeRequest,
    QueryRequest,
    RefineRequest,
    SearchRequest,
    StrategizeRequest,
)
from app.services import claude_client

router = APIRouter(tags=["agents"])


# ============================================================
#  Новые ручки
# ============================================================


@router.post("/refine")
def refine(request: RefineRequest):
    return refine_query(request.text, request.user_context)


@router.post("/strategize")
def make_strategy(request: StrategizeRequest):
    return strategize(request.query)


@router.post("/search")
def search(request: SearchRequest):
    strategy = request.strategy or strategize(request.query)
    listings = orchestrator.execute(strategy, target_count=request.query.target_count)
    return {"strategy": strategy, "listings": listings}


# ============================================================
#  Legacy — пусть старый фронт ещё работает
# ============================================================


@router.post("/query")
def query(request: QueryRequest):
    return build_structured_query(request.text, request.params)


@router.post("/search-legacy")
def search_legacy(request: LegacySearchRequest):
    return search_mock_listings(request.query, request.params)


@router.post("/normalize")
def normalize(request: NormalizeRequest):
    return normalize_listing_results(request.listings, request.params, request.query)


@router.get("/health/llm")
def health_llm() -> dict[str, object]:
    from app.core.settings import get_settings
    return {
        "enabled": claude_client.is_enabled(),
        "model": get_settings().anthropic_model,
        "rapidapi_configured": bool(get_settings().rapidapi_key),
    }
