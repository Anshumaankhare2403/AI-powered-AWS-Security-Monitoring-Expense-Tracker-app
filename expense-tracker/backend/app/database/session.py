import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("expense_tracker.database")

Base = declarative_base()


def get_working_engine():
    # Attempt connecting to primary configured DATABASE_URL (MySQL)
    try:
        connect_args = {}
        if settings.DATABASE_URL.startswith("sqlite"):
            connect_args = {"check_same_thread": False}

        eng = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args=connect_args,
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"Connected to primary database: {settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        return eng
    except Exception as e:
        logger.warning(f"Could not connect to primary database ({e}). Falling back to local SQLite database.")
        sqlite_url = "sqlite:///./expense_tracker.db"
        sqlite_engine = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
        )
        return sqlite_engine


engine = get_working_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
