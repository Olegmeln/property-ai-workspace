from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_settings
from app.routes import agents

settings = get_settings()

app = FastAPI(title="Property AI Workspace API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
