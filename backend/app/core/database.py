import os
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings

db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Ensure SSL mode is set for cloud postgres connections (Supabase, AWS, Render)
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}
elif "supabase" in db_url or "render.com" in db_url or "amazonaws.com" in db_url:
    if "sslmode" not in db_url:
        connect_args = {"sslmode": "require"}

# Resilient engine creation with auto-reconnect
try:
    if "sqlite" in db_url:
        engine = create_engine(db_url, connect_args=connect_args)
    else:
        # Test postgres connectivity
        test_engine = create_engine(
            db_url,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        with test_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = test_engine
        print("[Database] Successfully connected to PostgreSQL Database!")
except Exception as e:
    print(f"[Database] PostgreSQL connection failed ({e}). Falling back to local SQLite database.")
    sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "health_records.db")
    engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
