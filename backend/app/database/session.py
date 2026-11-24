import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger("expense_tracker.database")

Base = declarative_base()


def get_working_engine():
    # Strict connection to configured DATABASE_URL (AWS RDS MySQL)
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
        db_target = settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL
        logger.info(f"Connected to AWS RDS database: {db_target}")
        return eng
    except Exception as e:
        logger.error(f"FATAL: Could not connect to primary AWS RDS database ({e}). Local fallback is strictly disabled.")
        raise RuntimeError(f"Database connection error: Could not reach AWS RDS at {settings.DATABASE_URL}: {e}")


engine = get_working_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
