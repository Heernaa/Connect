"""Comprobación de salud del servicio, incluida la conexión con PostgreSQL."""

from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import get_engine

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Estado del servicio y de su dependencia principal."""

    status: Literal["ok", "degraded"]
    database: Literal["connected", "unreachable"]


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Comprueba que la API responde y que PostgreSQL acepta conexiones",
)
def health(response: Response) -> HealthResponse:
    """Devuelve 200 solo si la base de datos responde.

    Si PostgreSQL no está accesible devuelve 503 en vez de 200: un health check
    que miente es peor que no tenerlo.
    """
    try:
        with get_engine().connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return HealthResponse(status="degraded", database="unreachable")

    return HealthResponse(status="ok", database="connected")