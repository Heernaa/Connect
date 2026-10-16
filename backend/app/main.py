"""Punto de entrada de la API.

El prefijo `/api` es el punto de entrada del servidor: a partir de aquí la
aplicación no depende del servidor web que la monta.
"""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.errors import ApiError, api_error_handler, http_exception_handler, validation_error_handler
from app.routers import auth, chat, games, health, leaderboard, sessions

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

# Los errores se devuelven siempre con la misma forma, con el mensaje en claro
# para quien lo lee. Sin esto, FastAPI respondería con su propio formato técnico
# en inglés (§4.1, spec 003 · R-007).
app.add_exception_handler(ApiError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_error_handler)
# Se registra la de Starlette y no la de FastAPI: el 404 de una ruta
# inexistente la lanza Starlette, y con la de FastAPI se escaparía sin traducir.
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(games.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")
app.include_router(chat.router, prefix="/api")