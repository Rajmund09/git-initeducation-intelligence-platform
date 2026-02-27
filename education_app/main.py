"""
main.py

FastAPI application entry point for the Education Intelligence API.

Responsibilities:
    - Initialise the FastAPI application with metadata.
    - Register CORS middleware (permissive for hackathon demo).
    - Mount the education router.
    - Expose a root health-check endpoint.

Architecture:
    HTTP Client → main.py → education_routes.py → EducationService → Engines
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from education_app.routes.education_routes import router as education_router
app = FastAPI(title="Education Intelligence API")
app.include_router(education_router)
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # change to frontend domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

def create_app() -> FastAPI:
    """
    Construct and configure the FastAPI application instance.

    Returns
    -------
    FastAPI
        Fully configured application ready for mounting or direct execution.
    """
    application = FastAPI(
        title="Education Intelligence API",
        description=(
            "Production-grade REST API for the AI-Powered Financial Education Platform. "
            "Provides deterministic explainability for technical indicators, AI ensemble decisions, "
            "user prediction evaluation, investment strategy simulation, quiz assessment, "
            "engagement streak tracking, and learning progress snapshots. "
            "All logic is rule-based and deterministic — no generative AI, no external APIs."
        ),
        version="1.0.0",
        contact={
            "name": "Education Intelligence Module",
        },
        license_info={
            "name": "MIT",
        },
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # ------------------------------------------------------------------
    # Middleware
    # ------------------------------------------------------------------

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ------------------------------------------------------------------
    # Routers
    # ------------------------------------------------------------------

    application.include_router(education_router)

    # ------------------------------------------------------------------
    # Startup / shutdown events
    # ------------------------------------------------------------------

    @application.on_event("startup")
    async def on_startup() -> None:
        logger.info("Education Intelligence API started.")

    @application.on_event("shutdown")
    async def on_shutdown() -> None:
        logger.info("Education Intelligence API shutting down.")

    # ------------------------------------------------------------------
    # Root health check
    # ------------------------------------------------------------------

    @application.get(
        "/",
        tags=["Health"],
        summary="Root health check",
        response_description="Service liveness confirmation with timestamp.",
    )
    async def health_check() -> JSONResponse:
        """
        Confirm the service is alive and return the current UTC timestamp.

        Returns HTTP 200 with a JSON payload containing:
            - status: always "ok"
            - service: application title
            - version: application version
            - timestamp: current UTC ISO-8601 datetime
        """
        return JSONResponse(
            content={
                "status": "ok",
                "service": "Education Intelligence API",
                "version": "1.0.0",
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            }
        )

    @application.get(
        "/health",
        tags=["Health"],
        summary="Detailed health check",
        response_description="Extended liveness payload for load-balancer probes.",
    )
    async def detailed_health() -> JSONResponse:
        """
        Extended health endpoint suitable for orchestrator liveness probes.
        Returns HTTP 200 while the service is operational.
        """
        return JSONResponse(
            status_code=200,
            content={
                "status": "healthy",
                "service": "Education Intelligence API",
                "version": "1.0.0",
                "uptime": "running",
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
            },
        )

    return application


# ---------------------------------------------------------------------------
# Application instance (module-level, imported by uvicorn / ASGI runners)
# ---------------------------------------------------------------------------

app = create_app()

# ---------------------------------------------------------------------------
# Direct execution entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    uvicorn.run(
        "education_app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )