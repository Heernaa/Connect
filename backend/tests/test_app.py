"""Tests de la configuración del servidor web (spec 001 · R-004)."""

from fastapi.testclient import TestClient

from app.main import app


def test_api_lives_under_the_api_prefix() -> None:
    """R-004: la API se sirve bajo /api, no en la raíz."""
    client = TestClient(app)

    assert client.get("/api/health").status_code == 200
    assert client.get("/health").status_code == 404


def test_docs_are_available_in_development() -> None:
    """R-004: la documentación interactiva está disponible en desarrollo."""
    client = TestClient(app)

    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200