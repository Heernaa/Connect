"""Configuración compartida de los tests del backend."""

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_engine


@pytest.fixture
def db_engine():
    """Motor contra la base de datos de desarrollo.

    Los tests de integración necesitan PostgreSQL real, no un doble: el
    comportamiento que se prueba (restricciones únicas, cascadas, normalización
    en base de datos) no existe en un motor en memoria.
    """
    engine = get_engine()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:  # noqa: BLE001 - el mensaje es lo que importa
        pytest.skip(f"PostgreSQL no está accesible: {error}")
    return engine


@pytest.fixture
def db_session(db_engine) -> Session:
    """Sesión transaccional que se deshace al terminar el test.

    Cada test ve la base de datos real pero nunca deja datos detrás, así que el
    orden de ejecución no cambia el resultado.
    """
    connection = db_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode="create_savepoint")

    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()