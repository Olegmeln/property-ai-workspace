from app.services.celery_app import celery_app


@celery_app.task(name="app.services.tasks.agent_job")
def agent_job(agent_type: str, payload: dict) -> dict:
    return {"agent_type": agent_type, "payload": payload, "status": "completed"}
