from app.celery_app import celery_app


@celery_app.task(name="app.tasks.ping")
def ping() -> dict:
    """Lightweight health task so the Celery worker can start cleanly."""
    return {"status": "ok"}


@celery_app.task(name="app.tasks.analysis_placeholder")
def analysis_placeholder(document_id: int) -> dict:
    """
    Scaffold task reserved for future async analysis wiring.
    The project currently runs analysis through FastAPI background tasks.
    """
    return {
        "status": "queued",
        "document_id": document_id,
        "message": "Celery scaffold is active, but analysis is not yet wired to worker tasks.",
    }
