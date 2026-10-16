"""Tests de la configuración por entorno (spec 001 · R-002, R-003)."""

import pytest
from pydantic import ValidationError

from app.config import DEVELOPMENT_SECRET_KEY, Settings


def test_development_starts_without_configuring_anything() -> None:
    """R-002: en desarrollo hay valores por defecto y no hay que configurar nada."""
    settings = Settings(environment="development")

    assert settings.database_url.startswith("postgresql+psycopg://")
    assert settings.secret_key == DEVELOPMENT_SECRET_KEY
    assert "http://localhost:5173" in settings.cors_origins


def test_production_requires_a_real_secret_key() -> None:
    """R-003: en producción, la clave de desarrollo detiene el arranque."""
    with pytest.raises(ValidationError, match="SECRET_KEY es obligatoria en producción"):
        Settings(environment="production", secret_key=DEVELOPMENT_SECRET_KEY)


def test_production_accepts_an_explicit_secret_key() -> None:
    """R-003: en producción se arranca si la clave propia está definida."""
    settings = Settings(environment="production", secret_key="a" * 64)

    assert settings.is_production
    assert settings.secret_key == "a" * 64


def test_development_secret_key_is_not_a_secret() -> None:
    """El valor de desarrollo está en el repositorio a propósito (§7.0).

    Este test falla si alguien lo cambia por algo que parezca un secreto de
    verdad: la clave de desarrollo debe seguir siendo obviamente pública.
    """
    assert "not-a-secret" in DEVELOPMENT_SECRET_KEY