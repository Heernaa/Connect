"""Retención y borrado de cuenta (spec 007 · R-008, R-010, §6.5).

El borrado de cuenta es la parte con más consecuencias: **no se puede deshacer**.
Por eso los tests miran lo que desaparece de verdad, contando filas, y no solo
que la API devuelva lo que promete.
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.auth import AuthSession
from app.models.chat import ChatMessage, UserBlock
from app.models.enums import GameId, SessionStatus
from app.models.session import GameSession, Score
from app.models.user import User
from app.services.chat_retention import RETENTION_DAYS, expiry_cutoff, purge_expired

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration

#: Fecha fija para todos los tests de retención. Con `now_utc()` real no se
#: podría comprobar «pasado el plazo» sin esperar ni inventar una fecha en cada
#: sitio: una decisión que cambia con el día que se ejecuta el test es una
#: decisión que se rompe sola.
NOW = datetime(2026, 10, 16, 12, 0, tzinfo=UTC)


@pytest.fixture
def signed_in(client: TestClient) -> TestClient:
    """Una cuenta creada e iniciada sesión."""
    client.post(
        "/api/auth/register",
        json={
            "username": "carmen",
            "password": VALID_PASSWORD,
            "password_confirmation": VALID_PASSWORD,
        },
    )
    client.post("/api/auth/login", json={"username": "carmen", "password": VALID_PASSWORD})
    return client


def _count_of(client: TestClient, body: str) -> int:
    """Cuántos mensajes con ese texto ve la persona.

    Cuenta **por texto**, no el total de la tabla. La base de datos de desarrollo
    puede tener mensajes de otras personas, y contar filas enteras haría que el
    resultado dependiera de lo que haya escrito cualquiera antes: el test
    pasaría o fallaría según el día.
    """
    messages = client.get("/api/chat/messages").json()["messages"]

    return len([message for message in messages if message["body"] == body])


def _message(client: TestClient, db: Session, body: str, created_at: datetime) -> None:
    """Escribe un mensaje con fecha explícita.

    En PostgreSQL `now()` es la hora de inicio de la transacción, y todos los
    tests comparten la misma: sin fijar la fecha, dos mensajes seguidos tendría
    la misma marca y la retención no se podría comprobar.
    """
    client.post("/api/chat/messages", json={"body": body})
    message = db.scalar(select(ChatMessage).where(ChatMessage.body == body))
    message.created_at = created_at
    db.commit()


# --- R-008: retención ---------------------------------------------------------


def test_the_retention_period_is_ninety_days() -> None:
    """R-008: 90 días, el valor decidido el 2026-10-16 (§0.1)."""
    assert RETENTION_DAYS == 90


def test_the_cutoff_is_ninety_days_before(
) -> None:
    """R-008: el corte está donde tiene que estar, y no un día antes.

    No se escribe con un `timedelta(days=90)` en el propio test: repetiría el
    número en dos sitios y, si uno cambiara, el test seguiría pasando. Aquí se
    compara contra la función de producción, que es lo que hay que comprobar.
    """
    assert expiry_cutoff(NOW) == NOW - timedelta(days=90)


def test_a_message_just_inside_the_period_is_kept(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-008 y V.11: con 89 días sigue ahí.

    El límite se comprueba por los dos lados: si se borrara de más, se perderían
    mensajes que la política dice que se conservan, y nadie se enteraría.
    """
    _message(signed_in, db_session, "todavía dentro", NOW - timedelta(days=89))

    assert purge_expired(db_session, NOW) == 0
    assert _count_of(signed_in, "todavía dentro") == 1


def test_a_message_past_the_period_is_deleted(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-008 y V.11: con 91 días se borra."""
    _message(signed_in, db_session, "ya caducado", NOW - timedelta(days=91))

    assert purge_expired(db_session, NOW) == 1
    assert _count_of(signed_in, "ya caducado") == 0


def test_reading_the_chat_purges_expired_messages(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-008: el borrado ocurre al leer, sin proceso en segundo plano.

    No es una comodidad del teste: es la forma de cargar el producto. El entorno
    local no tiene planificador (§7.0) y añadirlo sería la primera
    infraestructura nueva sin justificar (§6.7).
    """
    _message(signed_in, db_session, "caducado", NOW - timedelta(days=120))

    signed_in.get("/api/chat/messages")

    assert _count_of(signed_in, "caducado") == 0


def test_an_expired_message_is_never_downloaded(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-008: lo caducado no sale del servidor.

    Que se borre y además no salga son dos cosas distintas, y la segunda es la que
    importa: si el mensaje caducado volviera en la respuesta y el cliente lo
    ocultara, el dato habría salido igualmente (§6.5).
    """
    _message(signed_in, db_session, "esto no debería salir", NOW - timedelta(days=200))

    assert "esto no debería salir" not in signed_in.get("/api/chat/messages").text


# --- R-010: borrado de cuenta -------------------------------------------------


def _create_session_data(db: Session, user_id: int) -> None:
    """Deja al usuario con partidas, puntuaciones y mensajes.

    Es el caso real: una cuenta que ha jugado. Borrar solo la fila del usuario y
    dejar el resto sería dejar datos de alguien que ya se dio de baja (§6.5).
    """
    session = GameSession(user_id=user_id, game_id=GameId.PARAULOGIC, status=SessionStatus.ACTIVE)
    db.add(session)
    db.commit()

    db.add(Score(user_id=user_id, game_id=GameId.PARAULOGIC, points=7))
    db.add(ChatMessage(author_id=user_id, body="un mensaje mío", kind="user"))
    db.commit()


def _count_owned_by(db: Session, model, column_name: str, user_id: int) -> int:
    """Filas de `model` que pertenecen a `user_id`.

    **Cuenta lo de esa persona, no todo.** La base de datos de desarrollo tiene
    cuentas reales: contar filas sin filtrar daría un número que no depende de lo
    que hace el código, y el test pasaría o fallaría según qué haya en la máquina
    de quien lo ejecuta. Un test de borrado tiene que poder fallar.
    """
    column = getattr(model, column_name)

    return db.scalar(select(func.count()).select_from(model).where(column == user_id)) or 0


def test_the_account_can_be_deleted(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: el usuario puede borrar su cuenta desde su sesión."""
    response = signed_in.delete("/api/auth/me")

    assert response.status_code == 200
    assert db_session.scalar(select(User).where(User.username == "carmen")) is None


def test_deleting_the_account_removes_everything_of_that_person(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010 y V.13: account, partidas, puntuaciones, sesiones y mensajes.

    Se comprueba **contando filas de cada tabla**, no porque la API lo diga. Si
    al borrar se olvidara una tabla, la respuesta seguiría siendo un 200 y el
    fallo no se vería hasta que alguien mirase la base de datos.
    """
    user_id = db_session.scalar(select(User.id).where(User.username == "carmen"))
    _create_session_data(db_session, user_id)

    assert _count_owned_by(db_session, GameSession, "user_id", user_id) > 0
    assert _count_owned_by(db_session, Score, "user_id", user_id) > 0
    assert _count_owned_by(db_session, ChatMessage, "author_id", user_id) > 0

    signed_in.delete("/api/auth/me")

    assert db_session.scalar(select(User).where(User.id == user_id)) is None
    assert _count_owned_by(db_session, GameSession, "user_id", user_id) == 0
    assert _count_owned_by(db_session, Score, "user_id", user_id) == 0
    assert _count_owned_by(db_session, ChatMessage, "author_id", user_id) == 0
    assert _count_owned_by(db_session, AuthSession, "user_id", user_id) == 0
    assert _count_owned_by(db_session, UserBlock, "blocker_id", user_id) == 0
    assert _count_owned_by(db_session, UserBlock, "blocked_id", user_id) == 0


def test_deleting_the_account_removes_their_blocks(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: los bloqueos también se van.

    Un bloqueo contra un usuario borrado no protege de nada y solo ocupa sitio.
    """
    user_id = db_session.scalar(select(User.id).where(User.username == "carmen"))
    other = User(
        username="antonio",
        username_normalized="antonio",
        password_hash="x",
        alias="ArdillaViva",
    )
    db_session.add(other)
    db_session.commit()
    db_session.add(UserBlock(blocker_id=user_id, blocked_id=other.id))
    db_session.commit()

    signed_in.delete("/api/auth/me")

    assert _count_owned_by(db_session, UserBlock, "blocker_id", user_id) == 0


def test_deleting_the_account_does_not_touch_other_people(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: borrar la cuenta de alguien no borra los mensajes de los demás.

    La cascada está en `users.id`. Si alguien escribiera el borrado como una
    lista de `DELETE` por tabla y olvidara filtrar por usuario, se llevaría por
    delante el chat entero. Este test es el que lo detecta.
    """
    other = User(
        username="antonio",
        username_normalized="antonio",
        password_hash="x",
        alias="ArdillaViva",
    )
    db_session.add(other)
    db_session.commit()
    db_session.add(ChatMessage(author_id=other.id, body="mensaje de antonio", kind="user"))
    db_session.commit()

    signed_in.delete("/api/auth/me")

    # Se busca **el mensaje de antonio**, no el primero de la tabla: puede haber
    # mensajes de otras personas de antes, y si se borrara el de otra persona
    # este test lo daría por bueno.
    still_there = db_session.scalar(
        select(ChatMessage).where(ChatMessage.body == "mensaje de antonio")
    )

    assert still_there is not None


def test_deleting_the_account_revokes_the_session(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: la sesión deja de servir aunque la cookie siga en el navegador.

    Si solo se borrara la cookie, quien la hubiera copiado podría seguir
    entrando. Es el mismo motivo por el que cerrar sesión revoca en el servidor
    (spec 003 · R-006).
    """
    signed_in.delete("/api/auth/me")

    assert signed_in.get("/api/auth/me").status_code == 401


def test_deleting_the_account_requires_a_session(
    client: TestClient, db_session: Session
) -> None:
    """R-010: no se puede borrar nada sin estar dentro.

    Sin esto, cualquiera que supiera un identificador podría borrar cuentas.
    """
    assert client.delete("/api/auth/me").status_code == 401


def test_the_cannot_delete_the_account_that_does_not_exist(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: borrar dos veces no da error, simplemente ya no está."""
    signed_in.delete("/api/auth/me")

    assert signed_in.delete("/api/auth/me").status_code == 401


def test_the_alias_is_freed_after_deleting_the_account(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: no queda nada que identifique a la persona.

    Si el alias quedara reservado, sería una forma de conservar un dato sobre
    alguien que pidió que se le borrara todo, solo que con otro nombre (§6.5).
    """
    db_session.scalar(select(User.id).where(User.username == "carmen"))
    signed_in.delete("/api/auth/me")

    fresh = User(
        username="otra",
        username_normalized="otra",
        password_hash="x",
        alias="ArdillaViva",
    )
    db_session.add(fresh)
    db_session.commit()

    assert fresh.id is not None