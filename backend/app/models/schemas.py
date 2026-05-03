from pydantic import BaseModel, Field


class StructuredQuery(BaseModel):
    city: str = "Austin"
    budget_max: int = Field(default=850_000, ge=0)
    rooms_min: int = Field(default=2, ge=0)
    districts: list[str] = Field(default_factory=list)


class Listing(BaseModel):
    id: str
    title: str
    price: float
    area: float
    rooms: float
    district: str
    lat: float
    lng: float
    score: float


class QueryRequest(BaseModel):
    text: str
    params: dict = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: StructuredQuery
    params: dict = Field(default_factory=dict)


class NormalizeRequest(BaseModel):
    listings: list[Listing]
    params: dict = Field(default_factory=dict)
