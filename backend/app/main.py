from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import agents

app = FastAPI(title="Property AI Workspace API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
