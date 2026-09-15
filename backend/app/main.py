from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base
from app.config import settings
from app.routers import (
    prediction,
    auth,
    bugs,
    analytics,
    knowledge_base,
    chat,
    admin,
    notifications,
    search,
    team,
    reports,
)

# Create tables on startup (fine for SQLite / local dev; use Alembic migrations in production)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Intelligent Bug Diagnosis Platform with Fix Recommendation Assistance API",
    description="REST API for submitting, tracking, and analyzing bug reports.",
    version="1.0.0",
)


@app.on_event("startup")
def on_startup():
    """Ensure persistent vector store is initialized on backend startup."""
    try:
        from app.database import SessionLocal
        from app.rag.vector_store import vector_store
        db = SessionLocal()
        try:
            vector_store.ensure_initialized(db)
        finally:
            db.close()
    except Exception as e:
        print(f"Vector store startup initialization notice: {e}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(bugs.router)
app.include_router(analytics.router)
app.include_router(knowledge_base.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(notifications.router)
app.include_router(search.router)
app.include_router(team.router)
app.include_router(reports.router)
app.include_router(prediction.router)


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok", "service": "smart-bug-analyzer-api"}

