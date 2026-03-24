"""
Tenant isolation middleware.
Extracts org_id from JWT and stores it on request.state for downstream use.
"""
import logging
from typing import Callable

from fastapi import Request, Response
from jose import JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

PUBLIC_PATHS = {
    "/", "/docs", "/openapi.json", "/redoc", "/health",
    "/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh",
}


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extracts org_id + user_id from the Bearer token and attaches them to
    request.state so routers can use them without re-decoding.
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request.state.user_id = None
        request.state.org_id = None

        if request.url.path in PUBLIC_PATHS or request.url.path.startswith("/static"):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                payload = decode_access_token(token)
                request.state.user_id = payload.get("sub")
                request.state.org_id = payload.get("org")
            except JWTError:
                pass  # invalid token handled by auth dependency

        return await call_next(request)
