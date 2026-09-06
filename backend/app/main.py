import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
import app.models  # Ensure all SQLAlchemy models are registered
from app.routers.health import router as health_router
from app.routers.documents import router as documents_router
from app.routers.timeline import router as timeline_router
from app.routers.emergency import router as emergency_router
from app.routers.consent import router as consent_router
from app.services.storage_service import LOCAL_UPLOAD_DIR


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        # Ensure file_data_base64 column exists in existing DBs
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('documents')]
        if 'file_data_base64' not in columns:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE documents ADD COLUMN file_data_base64 TEXT;"))
            print("[Database] Successfully added file_data_base64 column to documents table.")
    except Exception as e:
        print(f"[Warning] Database schema startup check note: {e}")
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Personal Health Record Platform for India's ABDM / ABHA Ecosystem (Team: Creative Tinkers)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads directory for document previews
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=LOCAL_UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(health_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(timeline_router, prefix="/api")
app.include_router(emergency_router, prefix="/api")
app.include_router(consent_router, prefix="/api")


@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "team": "Creative Tinkers",
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "health": "/api/health",
        "disclaimer": "AI features are assistive. Always consult a certified healthcare professional for medical diagnosis."
    }
