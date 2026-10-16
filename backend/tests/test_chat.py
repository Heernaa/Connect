"""El chat (spec 007 · R-003, R-004, R-005, R-006, R-007, R-009).

Los tests de mayor peso aquí son los **negativos**: lo que el chat no deja
hacer. Un chat sin moderación se sostiene sobre que sus límites selean reales,
no sobre que haya un botón de bloquear. Si un enlace se puede colar por la API,
el phishing sigue siendo posible aunque la interfaz no lo ofrezca (§2.5).
"""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, MessageKind, UserBlock
from app.models.user import User
from app.services.chat_retention import now_utc

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration


def register(client: TestClient, username: str) -> TestClient:
    """Crea una cuenta e inicia sesión con ella.

    Cada test que habla en el chat necesita **dos** personas, porque casi todo lo
    que hay que comprobar es una relación entre dos: quién ve qué, quién puede
    escribir a quién.
    """
    client.post(
        "/api/auth/register",
        json={
            "username": username,
            "password": VALID_PASSWORD,
            "password_confirmation": VALID_PASSWORD,
        },
    )
    client.post("/api/auth/login", json={"username": username, "password": VALID_PASSWORD})
    return client


def user_named(db: Session, username: str) -> User:
    return db.scalar(select(User).where(User.username == username))


def user_id_of(db: Session, username: str) -> int:
    return user_named(db, username).id


def post_message(
    client: TestClient, db: Session, body: str, after: datetime | None = None
) -> None:
    """Escribe un mensaje con una marca de tiempo explícita.

    **Por qué no se deja el `created_at` por defecto.** En PostgreSQL, `now()`
    dentro de una transacción es la hora en que la transacción empezó, no la del
    `INSERT`. Los tests corren todos en la misma transacción, así que dos
    mensajes seguidos tendría la misma marca y el incremental por `since` —que
    es la base del polling (R-003)— no se podría comprobar.

    Fijar la fecha hace que el test mida el incremental y no la resolución del
    reloj. El servidor, en producción, sí usa la hora de la petición: cada
    petición es su propia transacción.
    """
    client.post("/api/chat/messages", json={"body": body})

    message = db.scalar(select(ChatMessage).where(ChatMessage.body == body))
    message.created_at = after or now_utc()
    db.commit()


def register_second(client: TestClient, username: str) -> TestClient:
    """Crea una segunda cuenta con un cliente nuevo.

    Hace falta un `TestClient` aparte porque las cookies viven en el cliente:
    si se registrara con el mismo, la segunda persona sustituiría la sesión de
    la primera y las dos serían la misma.
    """
    return register(TestClient(client.app), username)


@pytest.fixture
def signed_in(client: TestClient) -> TestClient:
    """Una persona dentro. La comparten la mayoría de los tests de chat."""
    return register(client, "carmen")


@pytest.fixture
def other(client: TestClient) -> TestClient:
    """Una segunda persona dentro, con su propia sesión."""
    return register_second(client, "antonio")


# --- R-009: sin sesión no hay chat --------------------------------------------


def test_chat_requires_a_session(client: TestClient) -> None:
    """V.12: el chat no es accesible sin iniciar sesión."""
    assert client.get("/api/chat/messages").status_code == 401


def test_writing_requires_a_session(client: TestClient) -> None:
    """R-009: escribir también exige sesión, no solo leer."""
    response = client.post("/api/chat/messages", json={"body": "hola"})

    assert response.status_code == 401


# --- R-003 y R-005: lectura y alias -------------------------------------------


def test_a_message_shows_the_alias_and_not_the_username(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-005 y V.2: el chat enseña el alias, nunca el nombre de usuario."""
    user = db_session.scalar(select(User).where(User.username == "carmen"))

    signed_in.post("/api/chat/messages", json={"body": "Buenos días a todos"})

    body = signed_in.get("/api/chat/messages").text

    assert user.alias in body
    assert "carmen" not in body


def test_a_message_brings_alias_text_and_time(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-003: cada mensaje trae alias, texto y marca de tiempo."""
    signed_in.post("/api/chat/messages", json={"body": "Buenos días"})

    message = signed_in.get("/api/chat/messages").json()["messages"][0]

    assert message["body"] == "Buenos días"
    assert message["alias"]
    assert message["created_at"]


def test_reading_only_returns_what_is_new(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-003: el polling incremental, no la conversación entera cada vez.

    Es lo que hace viable el polling: si cada consulta devolviera todo, en una
    conversación larga se descargarían los mismos mensajes cada diez segundos,
    para siempre.
    """
    first = signed_in.get("/api/chat/messages").json()

    # Un instante **posterior** a la marca, que es lo que significa «nuevo». La
    # consulta es estricta (`>`): un mensaje con la misma marca que la del
    # polling no se considera nuevo, y en el reloj real eso no pasa porque cada
    # petición tiene su propia hora.
    marker = datetime.fromisoformat(first["poll_from"])
    post_message(signed_in, db_session, "El primero", after=marker + timedelta(seconds=1))
    post_message(signed_in, db_session, "El segundo", after=marker + timedelta(seconds=2))

    second = signed_in.get("/api/chat/messages", params={"since": first["poll_from"]}).json()

    assert [m["body"] for m in second["messages"]] == ["El primero", "El segundo"]


def test_the_marker_comes_back_as_a_readable_time(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-003: la marca se manda tal cual vuelve, sin formatos que inventar.

    El cliente la reenvía tal cual en la siguiente consulta. Si el servidor la
    devolviera en un formato y la aceptara en otro, el polling se cortaría en
    silencio en algún momento, y se vería como «a veces no llegan mensajes».
    """
    marker = signed_in.get("/api/chat/messages").json()["poll_from"]

    assert signed_in.get("/api/chat/messages", params={"since": marker}).status_code == 200


def test_a_message_written_before_the_marker_is_not_returned_again(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-003: lo anterior a la marca no vuelve a salir nunca.

    La otra mitad del polling incremental: si un mensaje anterior volviera a
    aparecer en cada consulta, la conversación crecería sola con copias de lo
    mismo.
    """
    post_message(signed_in, db_session, "Antiguo", after=datetime(2020, 1, 1, tzinfo=UTC))

    marker = signed_in.get("/api/chat/messages").json()["poll_from"]

    assert signed_in.get("/api/chat/messages", params={"since": marker}).json()["messages"] == []


def test_polling_returns_the_marker_even_when_nothing_is_new(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-003: sin mensajes nuevos, la marca avanza igualmente.

    Si no avanzara, el cliente seguiría preguntando siempre por el mismo
    instante, y en cuanto llegara algo anterior a ese instante no lo vería.
    """
    signed_in.post("/api/chat/messages", json={"body": "uno"})
    first = signed_in.get("/api/chat/messages").json()

    empty = signed_in.get("/api/chat/messages", params={"since": first["poll_from"]}).json()

    assert empty["messages"] == []
    assert empty["poll_from"] > first["poll_from"]


def test_messages_come_back_in_order(signed_in: TestClient, db_session: Session) -> None:
    """R-002: el orden es estable, también en el chat."""
    for text in ["uno", "dos", "tres"]:
        signed_in.post("/api/chat/messages", json={"body": text})

    bodies = [m["body"] for m in signed_in.get("/api/chat/messages").json()["messages"]]

    assert bodies == ["uno", "dos", "tres"]


# --- R-004: solo texto plano --------------------------------------------------


def test_html_is_shown_literally_and_not_executed(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-004 y V.6: `<b>` sale como texto, no se convierte en negrita."""
    signed_in.post("/api/chat/messages", json={"body": "<b>hola</b>"})

    message = signed_in.get("/api/chat/messages").json()["messages"][0]

    assert message["body"] == "<b>hola</b>"


def test_a_script_tag_is_also_shown_literally(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-004: tampoco se cuela HTML con intención de ejecutarse.

    La interfaz escapa al pintar, que es lo que evita la ejecución. El servidor
    acepta el texto porque un `<` en una frase («5 < 6») es algo normal de
    escribir y rechazalo sería más raro que dejarlo.
    """
    signed_in.post("/api/chat/messages", json={"body": "<script>alert(1)</script>"})

    assert signed_in.get("/api/chat/messages").text.count("<script>") == 1


@pytest.mark.parametrize(
    "texto",
    [
        "https://banco-falso.com/acceso",
        "http://www.ejemplo.es",
        "www.mi-enlace.com",
        "escribe a banco.com",
        "mira esto.com",
        "pincha en http://bit.ly/x",
    ],
)
def test_links_are_rejected_by_the_server(
    signed_in: TestClient, db_session: Session, texto: str
) -> None:
    """R-004 y V.7: el rechazo ocurre en el **servidor**, no en la interfaz.

    Si el filtro estuviera en el cliente, quien llamara a la API directamente
    podría escribir el enlace igual. Y aquí está el vector real de ataque contra
    este perfil de usuario (§6.8), así que no basta con esconder el botón.
    """
    response = signed_in.post("/api/chat/messages", json={"body": texto})

    assert response.status_code == 422
    assert signed_in.get("/api/chat/messages").json()["messages"] == []


@pytest.mark.parametrize(
    "texto",
    ["![foto](https://e.com/a.png)", "<img src=x>", "data:image/png;base64,AAA"],
)
def test_images_are_rejected(
    signed_in: TestClient, db_session: Session, texto: str
) -> None:
    """R-004 y V.7: tampoco se admiten imágenes."""
    assert signed_in.post("/api/chat/messages", json={"body": texto}).status_code == 422


def test_the_link_message_says_what_to_do(signed_in: TestClient, db_session: Session) -> None:
    """R-009: el error dice qué ha pasado y qué hacer.

    Decir «formato inválido» no sirve de nada: quien lo lee no sabe qué hacer
    distinto. Y no puede decir «se ha detectado un enlace», porque eso confirma
    que el filtro existe y anima a probar otro formato (§6.8).
    """
    response = signed_in.post("/api/chat/messages", json={"body": "https://banco.com"})

    assert "enlace" in response.json()["message"]
    assert "invalid" not in response.json()["message"].lower()


def test_messages_longer_than_the_limit_are_rejected(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-004: el límite de longitud acota el abuso (§6.8)."""
    response = signed_in.post("/api/chat/messages", json={"body": "a" * 501})

    assert response.status_code == 422


def test_a_message_of_exactly_the_limit_is_accepted(
    signed_in: TestClient, db_session: Session
) -> None:
    """El límite es 500 y entra el que llega justo. Un carácter más, no."""
    assert signed_in.post("/api/chat/messages", json={"body": "a" * 500}).status_code == 201


def test_an_empty_message_is_rejected(signed_in: TestClient, db_session: Session) -> None:
    """R-009: un mensaje vacío no es un mensaje."""
    assert signed_in.post("/api/chat/messages", json={"body": "   "}).status_code == 422


# --- R-006: bloqueo -----------------------------------------------------------


def test_blocking_is_a_single_step(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-006 y V.5: un `POST`, sin paso previo y sin confirmación.

    No se comprueba que «no haya diálogo», que no se puede comprobar desde la
    API. Se comprueba que hace falta **una** llamada: siblocking necesitara
    además un paso de confirmación, esta sería la segunda.
    """
    other_id = user_id_of(db_session, "antonio")

    assert signed_in.post(f"/api/users/{other_id}/block").status_code == 204


def test_a_blocked_user_cannot_write(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-006 y V.4: el bloqueo impide escribir. Es lo que lo hace protección.

    Sin esto el botón sería decorativo: se podría pulsar, ver que funcionó, y
    seguir recibiendo los mensajes.
    """
    signed_in.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    response = other.post("/api/chat/messages", json={"body": "déjame en paz"})

    assert response.status_code == 403


def test_the_block_message_does_not_say_who_blocked(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """§6.5: el error no revela quién bloqueó a quién.

    Decirlo confirmaría que esa persona tiene bloqueos activos, que es
    información sobre cómo usa la plataforma y que no hace falta para entender
    el mensaje.
    """
    signed_in.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    message = other.post("/api/chat/messages", json={"body": "hola"}).json()["message"]

    assert "carmen" not in message
    assert "antonio" not in message


def test_a_blocked_user_stops_seeing_the_blocker(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-006: el bloqueo es bidireccional en la práctica.

    Si el bloqueado siguiera viendo los mensajes, el bloqueo solo taparía el
    micrófono y dejaría el oído abierto.
    """
    signed_in.post("/api/chat/messages", json={"body": "esto lo verá el otro"})
    signed_in.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    bodies = [m["body"] for m in other.get("/api/chat/messages").json()["messages"]]

    assert "esto lo verá el otro" not in bodies


def test_the_blocker_still_sees_their_own_messages(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """Bloquear a alguien no borra lo que ya habías escrito."""
    signed_in.post("/api/chat/messages", json={"body": "lo escribí yo"})
    signed_in.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    bodies = [m["body"] for m in signed_in.get("/api/chat/messages").json()["messages"]]

    assert "lo escribí yo" in bodies


def test_blocked_users_messages_are_never_downloaded(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-006: los mensajes del bloqueador **no salen del servidor**.

    Que se filtren en el servidor y no en la pantalla es lo que distingue un
    bloqueo de un filtro: si el dato hubiera salido ya, ocultarlo en el cliente
    no impediría nada (R-006).
    """
    signed_in.post("/api/chat/messages", json={"body": "palabra secreta de carmen"})
    signed_in.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    assert "palabra secreta de carmen" not in other.get("/api/chat/messages").text


def test_unblocking_restores_everything(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-006: se puede desbloquear, y todo vuelve a funcionar."""
    other_id = user_id_of(db_session, "antonio")
    signed_in.post(f"/api/users/{other_id}/block")

    assert signed_in.delete(f"/api/users/{other_id}/block").status_code == 204
    assert other.post("/api/chat/messages", json={"body": "ya está bien"}).status_code == 201


def test_blocking_twice_is_harmless(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """Pulsar dos veces no da error.

    Un error aquí haría pensar que el botón está roto, cuando lo que ha pasado
    es que ya estaba hecho.
    """
    other_id = user_id_of(db_session, "antonio")

    assert signed_in.post(f"/api/users/{other_id}/block").status_code == 204
    assert signed_in.post(f"/api/users/{other_id}/block").status_code == 204


def test_blocking_yourself_is_refused(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-006: bloquearse a uno mismo es un error de dedo, no una función."""
    response = signed_in.post(f"/api/users/{user_id_of(db_session, 'carmen')}/block")

    assert response.status_code == 400


def test_blocking_someone_who_does_not_exist(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-006: no se acumulan bloqueos contra usuarios que no están."""
    assert signed_in.post("/api/users/999999/block").status_code == 404


def test_blocking_requires_a_session(client: TestClient, db_session: Session) -> None:
    """R-009: el bloqueo es una acción de cuenta, no se hace sin estar dentro."""
    register_second(client, "antonio")

    assert client.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block").status_code == 401


def test_the_block_is_stored_once(client: TestClient, db_session: Session) -> None:
    """R-006: un bloqueo es una fila, no dos.

    Guardar las dos direcciones sería duplicar el mismo hecho, y la tabla
    acabaría con estados imposibles («bloqueado pero visible») que nadie sabe
    arreglar.
    """
    carmen = register(client, "carmen")
    register(TestClient(client.app), "antonio")

    carmen.post(f"/api/users/{user_id_of(db_session, 'antonio')}/block")

    rows = db_session.scalars(select(UserBlock)).all()

    assert len(rows) == 1
    assert rows[0].blocker_id == user_id_of(db_session, "carmen")


# --- R-007: sin moderación ni reporte -----------------------------------------


def test_there_is_no_report_endpoint(client: TestClient, db_session: Session) -> None:
    """R-007 y V.10: **no existe** ningún endpoint de reporte.

    Se recorre el mapa de rutas de la aplicación y se busca cualquiera que hable
    de denuncia. Que algo no exista no se comprueba leyendo el código: se
    comprueba mirando que no está, y fallando si aparece.
    """
    paths = client.app.openapi()["paths"]
    report_routes = [path for path in paths if any(
        word in path.lower() for word in ("report", "denunc", "denuncia", "moder", "flag")
    )]

    assert report_routes == []


def test_there_is_no_report_table(db_session: Session) -> None:
    """R-007: tampoco hay dónde guardar una denuncia.

    Sin moderadores, guardar la denuncia no sirve para nada: no hay nadie que la
    lea. Una tabla así sería un sitio donde dejar datos de otras personas sin
    ningún propósito detrás (§6.5).
    """
    from app.models.base import Base

    assert not [name for name in Base.metadata.tables if "report" in name.lower()]


# --- R-009: privacidad --------------------------------------------------------


def test_no_column_stores_an_ip(db_session: Session) -> None:
    """R-009: ninguna tabla guarda la IP de quien escribe.

    El chat es un dato personal (§6.5) y la IP también. Guardarla no aporta nada
    al producto y crea una obligación de conservarla o borrarla que aquí no hay
    nadie mirando. Se comprueba sobre el esquema entero, no sobre un archivo.
    """
    from app.models.base import Base

    for table in Base.metadata.tables.values():
        assert "ip" not in [column.name.lower() for column in table.columns]


def test_messages_are_marked_as_mine(
    signed_in: TestClient, other: TestClient, db_session: Session
) -> None:
    """R-005: el servidor dice cuáles mensajes son tuyos.

    Sin esto, la interfaz tendría que comparar alias, que es confiar en lo que se
    ha pintado en pantalla en lugar de en lo que dice el servidor.
    """
    signed_in.post("/api/chat/messages", json={"body": "escrito por carmen"})

    seen_by_antonio = other.get("/api/chat/messages").json()["messages"][0]

    assert seen_by_antonio["is_mine"] is False


def test_system_messages_are_marked_as_such(db_session: Session) -> None:
    """R-007: los mensajes del sistema se distinguen de los de los usuarios.

    Sin esto, cualquiera podría escribir algo con el aspecto de un aviso del
    sistema y que la gente lo creyera (§6.4).
    """
    db_session.add(ChatMessage(author_id=None, body="Aviso del sistema", kind=MessageKind.SYSTEM))
    db_session.commit()

    assert db_session.scalar(select(ChatMessage.kind)) == "system"