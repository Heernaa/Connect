"""Motor de SQLAlchemy y fábrica de sesiones.

Se crea el motor de forma perezosa para que importar la aplicación no abra una
conexión: los tests y el arranque no deben depender de que la base de datos esté
en pie hasta que realmente se necesita.
"""

from functools import lru_cache

from sqlalchemy import Engine, create_engine

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """Devuelve el motor, creado una sola vez por proceso."""
    settings = get_settings()
    return create_engine(
        settings.database_url,
        # El pool se queda corto en local, donde la concurrencia es de una o dos
        # peticiones. Subirlo solo abriría conexiones sin usar.
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
    )