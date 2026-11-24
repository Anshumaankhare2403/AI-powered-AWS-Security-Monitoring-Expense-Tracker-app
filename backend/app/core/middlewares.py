import time
import uuid
import logging
from typing import Callable, Set
from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import decode_token

logger = logging.getLogger("expense_tracker.middleware")

# Thread-safe in-memory blacklist of revoked access tokens
REVOKED_ACCESS_TOKENS: Set[str] = set()


def revoke_access_token(token: str) -> None:
    """Add an access token to the revoked tokens blacklist."""
    REVOKED_ACCESS_TOKENS.add(token.strip())


def is_token_revoked(token: str) -> bool:
    """Check if an access token has been revoked / logged out."""
    return token.strip() in REVOKED_ACCESS_TOKENS


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


class UserIdentityAndPrivilegeMiddleware(BaseHTTPMiddleware):
    """
    Strict User Identity & Privilege Enforcement Middleware.
    Guarantees:
    1. Direct anonymous API calls cannot communicate with the server.
    2. Attached user ID (X-User-Id) is validated against authenticated JWT token claims to prevent ID spoofing.
    3. Unprivileged or unauthorized user IDs are strictly blocked (HTTP 403 Forbidden) from administrative and sensitive endpoints.
    """
    PUBLIC_PATHS: Set[str] = {
        "/",
        "/health",
        "/docs",
        "/redoc",
        "/api/openapi.json",
        "/openapi.json",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/refresh",
    }

    ADMIN_EMAIL_WHITELIST: Set[str] = {
        "admin@example.com",
        "anuj@example.com",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path

        # Allow CORS preflight requests and public endpoints
        if request.method == "OPTIONS" or not path.startswith("/api") or path in self.PUBLIC_PATHS:
            return await call_next(request)

        # 1. Require Authentication Header (Block direct unattached calls)
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            logger.warning(f"[SECURITY BLOCK] Direct unauthenticated access to {request.method} {path} blocked.")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "API calls cannot talk to server directly without user identity. Valid authorization credentials required.",
                    "error_code": "UNAUTHENTICATED_DIRECT_ACCESS_BLOCKED",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not auth_header.startswith("Bearer "):
            logger.warning(f"[SECURITY BLOCK] Invalid auth scheme on {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid authentication scheme. Bearer token required.",
                    "error_code": "INVALID_AUTH_SCHEME",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        # 2. Decode and validate token integrity
        token = auth_header[7:].strip()
        if is_token_revoked(token):
            logger.warning(f"[SECURITY BLOCK] Revoked token attempted access on {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Token has been revoked or logged out. Please log in again.",
                    "error_code": "TOKEN_REVOKED",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            logger.warning(f"[SECURITY BLOCK] Invalid or expired token on {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Invalid or expired token. Direct API access blocked.",
                    "error_code": "INVALID_OR_EXPIRED_TOKEN",
                },
                headers={"WWW-Authenticate": "Bearer"},
            )

        token_user_id = str(payload.get("sub") or payload.get("user_id") or "")
        if not token_user_id:
            logger.warning(f"[SECURITY BLOCK] Token without user ID subject on {request.method} {path}")
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "detail": "Token subject user ID missing. Direct API access blocked.",
                    "error_code": "MISSING_TOKEN_USER_ID",
                },
            )

        # 3. Validate Attached User ID (Anti-spoofing check)
        attached_user_id = request.headers.get("X-User-Id")
        if attached_user_id and str(attached_user_id).strip() != token_user_id:
            logger.warning(
                f"[SECURITY ALERT] User ID mismatch: attached '{attached_user_id}' != token '{token_user_id}' on {path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": f"Access blocked: Attached user ID '{attached_user_id}' does not match authenticated credentials ({token_user_id}). Identity spoofing detected.",
                    "error_code": "USER_ID_SPOOFING_BLOCKED",
                },
            )

        # 4. Privilege Verification for Administrative / Sensitive Endpoints
        is_admin = bool(payload.get("is_admin", False))
        token_email = str(payload.get("email", "")).lower()
        if token_email in self.ADMIN_EMAIL_WHITELIST:
            is_admin = True

        # Determine if target endpoint requires privilege
        is_privileged_endpoint = False
        if path == "/api/users" or path == "/api/users/":
            is_privileged_endpoint = True
        elif path.startswith("/api/security/scan") or path.startswith("/api/security/simulate-threat") or path.startswith("/api/security/resolve"):
            is_privileged_endpoint = True
        elif path.startswith("/api/users/"):
            # Check if accessing another user's profile
            subpath = path[len("/api/users/"):].strip("/")
            if subpath and subpath != "me" and not subpath.startswith("me/") and subpath != token_user_id:
                is_privileged_endpoint = True

        if is_privileged_endpoint and not is_admin:
            logger.warning(
                f"[SECURITY BLOCK] Unprivileged user ID {token_user_id} attempted access to privileged endpoint {path}"
            )
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "Access blocked: This endpoint requires administrator privilege. Unauthorized user ID denied.",
                    "error_code": "INSUFFICIENT_PRIVILEGE_BLOCKED",
                },
            )

        # Set verified identity and privilege in request state
        request.state.user_id = int(token_user_id)
        request.state.is_admin = is_admin

        # Proceed to downstream route handlers
        response = await call_next(request)

        # Attach identity and privilege confirmation headers to the response
        response.headers["X-Authenticated-User-Id"] = token_user_id
        response.headers["X-User-Privilege"] = "admin" if is_admin else "user"

        return response


# Alias for backward compatibility
AuthInspectionMiddleware = UserIdentityAndPrivilegeMiddleware
