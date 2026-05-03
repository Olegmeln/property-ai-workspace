from fastapi import APIRouter

from app.agents.query_builder import build_structured_query
from app.agents.result_normalizer import normalize_listing_results
from app.agents.search import search_mock_listings
from app.models.schemas import NormalizeRequest, QueryRequest, SearchRequest

router = APIRouter(tags=["agents"])


@router.post("/query")
def query(request: QueryRequest):
    return build_structured_query(request.text, request.params)


@router.post("/search")
def search(request: SearchRequest):
    return search_mock_listings(request.query, request.params)


@router.post("/normalize")
def normalize(request: NormalizeRequest):
    return normalize_listing_results(request.listings, request.params)
