"""
HireOn FastAPI application entry point.
Registers all routers, middleware, static files, and startup events.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.middleware.audit import AuditMiddleware
from app.middleware.tenant import TenantMiddleware
import app.models  # noqa: F401 — register all models with Base
from app.routers import (
    auth, organizations, users, jobs, candidates,
    resumes, ai, applications, pipeline,
    interviews, scorecards, offers,
    analytics, notifications, talent_pool, portal, admin, calendar, invitations,
    activities
)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    logger.info(f"🚀 HireOn API starting in {settings.app_env} mode")

    # Create all DB tables if they don't exist
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables ensured.")
    except Exception as e:
        logger.warning(f"Skipped table creation (likely concurrent creation by another worker): {e}")

    # Ensure upload directories exist
    Path(settings.upload_dir).mkdir(exist_ok=True)
    for sub in ["resumes", "jds", "offers", "avatars"]:
        Path(settings.upload_dir, sub).mkdir(exist_ok=True)
    yield
    logger.info("HireOn API shutting down")


app = FastAPI(
    title="HireOn API",
    description="AI-powered recruitment automation platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    logger.error(f"422 Validation error on {request.method} {request.url}: {errors}")
    return JSONResponse(status_code=422, content={"detail": errors})

# ── Middleware ─────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173", "http://localhost:3000"],
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)
app.add_middleware(AuditMiddleware)

# ── Static files (local uploads) ───────────────────────────────────────────────
uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(organizations.router)
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(candidates.router)
app.include_router(resumes.router)
app.include_router(ai.router)
app.include_router(applications.router)
app.include_router(pipeline.router)
app.include_router(interviews.router)
app.include_router(scorecards.router)
app.include_router(offers.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(talent_pool.router)
app.include_router(portal.router)
app.include_router(admin.router)
app.include_router(calendar.router)
app.include_router(invitations.router)
app.include_router(activities.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "app": settings.app_name, "version": "1.0.0", "env": settings.app_env}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "healthy"}
