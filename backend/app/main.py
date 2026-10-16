"""Punto de entrada de la API.

El prefijo `/api` es el punto de entrada del servidor: a partir de aquí la
aplicación no depende del servidor web que la monta.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import health

settings = get_settings()

app = FastAPI(
    title="Connect API",
    summary="Validación y puntuación de los juegos de Connect (§2.1.6)",
    version="0.1.0",
    # La documentación interactiva solo se expone fuera de producción: describe
    # toda la superficie de la API y no debe quedar publicada por accidente (§6.1).
    docs_url="/docs" if not settings.is_production else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api")