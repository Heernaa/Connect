"""Tests de la configuración del servidor web (spec 001 · R-004)."""

from fastapi.testclient import TestClient


def test_api_lives_under_the_api_prefix(client: TestClient) -> None:
    """R-004: la API se sirve bajo /api, no en la raíz."""
    assert client.get("/api/health").status_code == 200
    assert client.get("/health").status_code == 404


def test_docs_are_available_in_development(client: TestClient) -> None:
    """R-004: la documentación interactiva está disponible en desarrollo."""
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def test_every_error_response_uses_the_same_shape(client: TestClient) -> None:
    """§4.1: los errores siempre con la misma forma y con `message` en claro.

    Un error con una estructura distinta obligaría al cliente a comprobar los
    casos uno a uno, y es donde se cuelan los mensajes técnicos sin querer.
    """
    responses = [
        client.post("/api/auth/register", json={}),
        client.post("/api/auth/login", json={"username": "nadie", "password": "x"}),
        client.get("/api/auth/me"),
    ]

    for response in responses:
        assert response.status_code >= 400
        assert set(response.json()) == {"message"}