"""Tests del endpoint de salud (spec 001 · R-004)."""

import pytest
from fastapi.testclient import TestClient


def test_health_returns_ok_and_confirms_database(client: TestClient) -> None:
    """R-004: /api/health devuelve 200 e indica el estado de PostgreSQL."""
    response = client.get("/api/health")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "connected"


def test_health_reports_503_when_database_is_unreachable(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Un health check que miente es peor que no tenerlo: sin BD, 503."""
    from sqlalchemy.exc import OperationalError

    def _raise() -> None:
        raise OperationalError("SELECT 1", {}, Exception("no hay PostgreSQL"))

    monkeypatch.setattr("app.routers.health.get_engine", _raise)

    response = client.get("/api/health")

    assert response.status_code == 503
    assert response.json() == {"status": "degraded", "database": "unreachable"}