from celery import Celery

celery_app = Celery(
    "property_ai_workspace",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.task_routes = {"app.services.tasks.*": {"queue": "agents"}}
