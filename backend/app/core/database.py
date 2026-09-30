import os
from typing import Generator, Optional, Any
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

# SQLite fallback path
sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "health_records.db")
sqlite_engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
SqliteSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sqlite_engine)

pg_engine: Optional[Any] = None
PgSessionLocal: Optional[Any] = None

if "sqlite" not in db_url:
    try:
        pg_engine = create_engine(
            db_url,
            connect_args=connect_args,
            pool_pre_ping=True,
            pool_recycle=300,
        )
        PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)
    except Exception as e:
        print(f"[Database] Initial PostgreSQL engine creation note: {e}")

# Global fallback reference for scripts
engine = pg_engine or sqlite_engine
SessionLocal = PgSessionLocal or SqliteSessionLocal

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a database session per request.
    Dynamically routes to Supabase PostgreSQL when active, with automatic SQLite fallback.
    """
    global pg_engine, PgSessionLocal

    session: Optional[Session] = None

    # 1. Try PostgreSQL / Supabase
    if pg_engine and PgSessionLocal:
        try:
            session = PgSessionLocal()
            session.execute(text("SELECT 1"))
        except Exception as pg_err:
            if session:
                session.close()
            session = None

    # 2. Re-attempt initializing pg_engine if uninitialized or previously failed
    if not session and "sqlite" not in db_url:
        try:
            if not pg_engine:
                pg_engine = create_engine(
                    db_url,
                    connect_args=connect_args,
                    pool_pre_ping=True,
                    pool_recycle=300,
                )
                PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)
            if PgSessionLocal:
                test_s = PgSessionLocal()
                test_s.execute(text("SELECT 1"))
                session = test_s
        except Exception:
            if session:
                session.close()
            session = None

    # 3. Fallback to local SQLite
    if not session:
        session = SqliteSessionLocal()

    try:
        yield session
    finally:
        session.close()
