# Property AI Workspace

An MVP desktop-style workspace for AI-powered real estate search, analysis, and decision-making. It combines a draggable agent canvas, structured agent pipeline, result table/map, and agent-targeted chat.

## Stack

- React + TypeScript + Vite
- Tailwind CSS with shadcn-style local primitives
- React Flow canvas
- dnd-kit drag and drop
- Zustand workspace state
- TanStack Query provider
- AG Grid results table
- Mapbox GL JS map view
- Tauri desktop wrapper
- FastAPI backend with Pydantic models
- PostgreSQL, Redis, and Celery-ready backend structure

## Run Locally

Install frontend dependencies:

```bash
npm install
```

Start the backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Start the frontend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://127.0.0.1:5173`.

Run as a desktop app with Tauri:

```bash
npm run tauri dev
```

Optional infrastructure:

```bash
cd backend
docker compose up -d
```

Optional map rendering:

```bash
set VITE_MAPBOX_TOKEN=your_mapbox_token
npm run dev
```

Without a Mapbox token, the map panel shows a clear placeholder while preserving listing coordinates.

## MVP Flow

1. Drag agents from the left library onto the canvas.
2. Connect agents in a pipeline.
3. Select an agent to edit its parameters in the right sidebar.
4. Send agent instructions in the AI chat.
5. Run the pipeline: Query Builder -> Listing Search -> Result Normalizer.
6. Inspect normalized listings in the table or map panel.

## Backend Endpoints

- `POST /query`
- `POST /search`
- `POST /normalize`
- `GET /health`
