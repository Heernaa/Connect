"""Configuración del backend, leída solo del entorno (§6.1 regla 4).

Los valores por defecto son de desarrollo y permiten arrancar sin configurar
nada. En producción, una variable obligatoria ausente detiene el arranque con un
error explícito en vez de falling back a un valor inseguro (spec 001 · R-003).
"""

from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Clave de desarrollo. NO es un secreto: está en el repositorio a propósito para
# que el proyecto arranque sin configurar nada (§7.0). En producción es
# obligatoria y esta nunca se usa.
DEVELOPMENT_SECRET_KEY = "connect-local-development-key-not-a-secret"


class Settings(BaseSettings):
    """Configuración de la aplicación."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = "development"

    database_url: str = "postgresql+psycopg://connect:connect@localhost:5432/connect"

    secret_key: str = DEVELOPMENT_SECRET_KEY

    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @model_validator(mode="after")
    def _require_secret_key_in_production(self) -> "Settings":
        """Detiene el arranque si en producción falta la clave de firma (§6.1)."""
        if self.is_production and self.secret_key == DEVELOPMENT_SECRET_KEY:
            raise ValueError(
                "SECRET_KEY es obligatoria en producción. Define SECRET_KEY con un "
                "valor propio y único; no uses el valor de desarrollo."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Devuelve la configuración. Se cachea para leer el entorno una sola vez."""
    return Settings()