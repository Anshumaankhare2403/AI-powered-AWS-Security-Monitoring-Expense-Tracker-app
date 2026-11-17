from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import engine, get_db
from app.database.init_db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("expense_tracker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure database tables & default seeds exist
    logger.info("Initializing database and verifying MySQL connection...")
    try:
        init_db()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection successfully established.")
    except Exception as e:
        logger.error(f"Failed to connect to MySQL database: {e}")
        raise e
    yield
    # Shutdown
    logger.info("Application shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-Stack Expense Tracker API with MySQL persistent storage.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# CORS Middleware
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, list):
    allowed_origins = origins
else:
    allowed_origins = [origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
def read_root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).scalar()
        return {
            "status": "healthy",
            "database": "connected" if result == 1 else "unhealthy",
            "version": settings.VERSION,
        }
    except Exception as exc:
        logger.error(f"Health check failed: {exc}")
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(exc),
        }
