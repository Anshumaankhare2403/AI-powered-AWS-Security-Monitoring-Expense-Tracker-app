import time
import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("expense_tracker.middleware")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Production-grade Security Headers Middleware.
    Enforces browser-level protection against clickjacking, MIME-sniffing, and cross-site injection.
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


class RequestTracingAndTimingMiddleware(BaseHTTPMiddleware):
    """
    Request Observability & Latency Tracking Middleware.
    Injects unique X-Request-ID and measures exact processing latency (X-Process-Time).
    """
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            logger.error(f"[REQUEST {request_id}] Unhandled error during {request.method} {request.url.path}: {exc}")
            raise exc

        process_time_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = f"{process_time_ms:.2f}ms"

        # Log request summary
        logger.info(
            f"[{request_id[:8]}] {request.method} {request.url.path} -> "
            f"Status {response.status_code} ({process_time_ms:.2f}ms)"
        )
        return response


class AuthInspectionMiddleware(BaseHTTPMiddleware):
    """
    Authentication & Header Sanity Middleware.
    Logs and inspects authentication context across API boundaries.
    """
    PUBLIC_PATHS = {
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/api/openapi.json",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if request.method != "OPTIONS" and path.startswith("/api") and path not in self.PUBLIC_PATHS:
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                logger.debug(f"Unauthenticated request to protected endpoint: {request.method} {path}")
            elif not auth_header.startswith("Bearer "):
                logger.warning(f"Malformed Authorization header received on {path}")

        response = await call_next(request)
        return response
