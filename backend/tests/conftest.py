"""Configuración compartida de los tests del backend."""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.dependencies import get_db
from app.main import app

#: Rutas donde puede estar el seed dentro del contenedor. En la máquina del
#: desarrollador se encuentra subiendo por el árbol de directorios, porque ahí el
#: repositorio está entero.
CONTAINER_SEED_PATHS = ("/data/seed_v0.sql",)


def find_seed_path() -> Path:
    """Localiza `data/seed_v0.sql`.

    Los tests corren en dos entornos: en la máquina del desarrollador, donde está
    el repositorio completo, y dentro del contenedor, donde solo se monta
    `backend/`. Se prueban varios sitios en vez de fijar una ruta que solo
    funciona en uno de los dos.
    """
    candidates = []

    override = os.environ.get("SEED_PATH")
    if override:
        candidates.append(Path(override))

    candidates.extend(Path(part) for part in CONTAINER_SEED_PATHS)
    candidates.extend(
        parent / "data" / "seed_v0.sql" for parent in Path(__file__).resolve().parents
    )

    for candidate in candidates:
        if candidate.is_file():
            return candidate

    raise FileNotFoundError(
        "No se encuentra data/seed_v0.sql. Se buscó en: "
        + ", ".join(str(candidate) for candidate in candidates)
    )


def read_seed_sql() -> str:
    """Devuelve el seed sin comentarios ni su propio `BEGIN`/`COMMIT`.

    - Los comentarios se quitan porque, al mirar qué hace el script, no son
      código.
    - El `BEGIN;` y el `COMMIT;` se quitan porque aquí manda la transacción del
      test: un `COMMIT` intermedio dejaría datos que el rollback no deshace.
    """
    raw = find_seed_path().read_text(encoding="utf-8")

    lines = []
    for line in raw.splitlines():
        stripped = line.strip()
        if stripped.startswith("--") or stripped.upper() in {"BEGIN;", "COMMIT;"}:
            continue
        lines.append(line)

    return "\n".join(lines)


@pytest.fixture
def db_engine():
    """Motor contra la base de datos de desarrollo.

    Los tests de integración necesitan PostgreSQL real, no un doble: lo que se
    prueba (restricciones únicas, `CHECK`, cascadas) no existe en un motor en
    memoria.
    """
    engine = get_engine()
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as error:  # noqa: BLE001 - lo que importa es el mensaje
        pytest.skip(f"PostgreSQL no está accesible: {error}")
    return engine


@pytest.fixture
def transactional_session(db_engine) -> Iterator[Session]:
    """Sesión de base de datos que se deshace al terminar el test.

    Cada test ve la base de datos real pero nunca deja datos detrás, así que el
    orden de ejecución no cambia el resultado y se pueden relanzar los tests sin
    arrastrar cuentas de pruebas anteriores.
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


@pytest.fixture
def db_session(transactional_session) -> Session:
    """Alias de `transactional_session`, para los tests que solo necesitan la BD."""
    return transactional_session


@pytest.fixture
def seeded_db_session(db_session) -> Session:
    """Igual que `db_session`, pero con el contenido del MVP cargado.

    El seed se ejecuta **dentro** de la transacción del test, así que tampoco
    deja nada detrás y los tests no dependen de que alguien haya cargado el seed
    a mano antes de lanzarlos.
    """
    seed_sql = read_seed_sql()

    # Se usa la conexión nativa y no `exec_driver_sql` a propósito. Este último
    # pasa un diccionario de parámetros vacío, y entonces el controlador busca
    # marcadores `%` en el texto: el comodín de `LIKE 'Tengo ciudades%'` del
    # seed se interpretaría como un parámetro y la consulta fallaría. Sin
    # parámetros, el texto se envía tal cual.
    raw_connection = db_session.connection().connection.dbapi_connection
    with raw_connection.cursor() as cursor:
        cursor.execute(seed_sql)

    return db_session


@pytest.fixture
def client(transactional_session) -> Iterator[TestClient]:
    """Cliente HTTP que usa la sesión transaccional del test.

    La dependencia `get_db` se sustituye por la sesión del test. Sin esto, la
    aplicación abriría su propia sesión, haría `commit` de verdad y cada ejecución
    dejaría cuentas y sesiones en la base de datos de desarrollo.
    """
    def use_test_session() -> Iterator[Session]:
        yield transactional_session

    app.dependency_overrides[get_db] = use_test_session

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()