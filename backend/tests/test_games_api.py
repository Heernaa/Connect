"""API de contenido de los juegos (spec 004).

Los tests importantes son los de «no contiene soluciones». Se escriben como
**comprobación literal sobre el cuerpo entero de la respuesta**, no mirando campos
concretos: así siguen siendo válidos si mañana el formato cambia, que es
justamente lo que un test atado a la estructura no conseguiría.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.content import ParaulogicWord, Riddle, WordleWord
from app.models.enums import GameId, SessionStatus
from app.models.session import GameSession, ParaulogicFoundWord
from app.models.user import User

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration


@pytest.fixture
def signed_in(client: TestClient) -> TestClient:
    """Cliente con una cuenta creada y sesión abierta."""
    client.post(
        "/api/auth/register",
        json={
            "username": "carmen",
            "password": VALID_PASSWORD,
            "password_confirmation": VALID_PASSWORD,
        },
    )
    client.post(
        "/api/auth/login", json={"username": "carmen", "password": VALID_PASSWORD}
    )
    return client


@pytest.fixture
def player(db_session: Session, signed_in: TestClient) -> User:
    """El usuario de la sesión de `signed_in`.

    Existe para no tener que volver a «buscar el primero de la tabla», que es lo
    que rompía estos tests: `select(User.id).limit(1)` devuelve la cuenta más
    antigua de la base de datos, no la recién creada. Con la base de datos vacía
    coincidían por casualidad; en cuanto hay una cuenta real, el test montaba la
    partida de otra persona y fallaba sin motivo aparente.

    Se busca por el **nombre de usuario**, que es lo único que se sabe con
    certeza: no hay ambigüedad posible entre dos cuentas.
    """
    return db_session.scalar(select(User).where(User.username == "carmen"))


def _all_solution_strings(db_session: Session) -> list[str]:
    """Todo lo que NUNCA puede salir de la API: soluciones y respuestas."""
    words = db_session.scalars(select(ParaulogicWord.word)).all()
    wordle = db_session.scalars(select(WordleWord.word)).all()
    answers = db_session.scalars(select(Riddle.accepted_answer)).all()

    return [value.upper() for value in [*words, *wordle, *answers]]


# --- Listado de juegos (R-001) -----------------------------------------------


def test_list_is_available_without_a_session(client: TestClient) -> None:
    """V.1: el listado funciona sin iniciar sesión (modo espectador, §2.4)."""
    response = client.get("/api/games")

    assert response.status_code == 200
    assert len(response.json()) == 3


def test_list_contains_id_name_and_description(client: TestClient) -> None:
    response = client.get("/api/games")

    for game in response.json():
        assert game["game_id"]
        assert game["name"]
        assert game["description"]


def test_list_contains_no_solution(client: TestClient, db_session: Session) -> None:
    """R-001 y V.2: el listado no incluye la palabra ni la respuesta."""
    body = client.get("/api/games").text.upper()

    leaked = [secret for secret in _all_solution_strings(db_session) if secret in body]

    assert leaked == [], f"El listado ha filtrado soluciones: {leaked}"


# --- Paraulógic (R-002) ------------------------------------------------------


def test_paraulogic_returns_letters_and_pending_count(client: TestClient) -> None:
    """V.3: devuelve las letras y cuántas palabras faltan."""
    body = client.get("/api/games/paraulogic").json()

    assert body["letters"] == "AENRST"
    assert body["pending_count"] == 21


def test_paraulogic_contains_no_solution(client: TestClient, db_session: Session) -> None:
    """R-002 y V.3: ninguna de las 21 palabras sale en la respuesta."""
    body = client.get("/api/games/paraulogic").text.upper()

    leaked = [secret for secret in _all_solution_strings(db_session) if secret in body]

    assert leaked == [], f"Paraulógic ha filtrado soluciones: {leaked}"


def test_paraulogic_does_not_return_already_found_words(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-002 y V.4: las palabras ya encontradas tampoco salen.

    Se registra una palabra encontrada en la partida del jugador y se pide el
    contenido. El contador sí refleja el progreso, pero el texto de la palabra no
    aparece en ninguna parte de la respuesta.
    """
    user_id = _user_id(db_session)
    game_session = GameSession(
        user_id=user_id, game_id=GameId.PARAULOGIC, status=SessionStatus.ACTIVE
    )
    db_session.add(game_session)
    db_session.flush()

    word = db_session.scalar(select(ParaulogicWord).limit(1))
    assert word is not None

    db_session.add(ParaulogicFoundWord(session_id=game_session.id, word_id=word.id))
    db_session.commit()

    body = signed_in.get("/api/games/paraulogic").text.upper()

    assert word.word.upper() not in body


def _user_id(db_session: Session) -> int:
    """El identificador de la cuenta de prueba.

    Se mantiene por compatibilidad con los tests que ya lo usaban, pero **no
    busca «la primera de la tabla»**: hace lo mismo que la fixture `player`,
    buscando por nombre. Buscar la primera solo coincidía con la cuenta de
    prueba cuando la base de datos estaba vacía, y en cuanto alguien se
    registraba, estos tests empezaban a fallar sin explicación.
    """
    return db_session.scalar(select(User.id).where(User.username == "carmen"))


# --- Pistas (R-003) ----------------------------------------------------------


def test_hint_returns_a_single_hint(client: TestClient) -> None:
    """R-003: una pista, no todas."""
    response = client.get("/api/games/paraulogic/hint")

    assert response.status_code == 200
    body = response.json()
    assert body["hint_text"]
    assert body["word_length"] >= 3


def test_hint_prioritises_uncommon_words(client: TestClient) -> None:
    """V.5: se priorizan las palabras poco comunes (`is_common = false`).

    Se piden varias y todas deberían salir de entre las menos conocidas: si
    priorizara al azar, alguna saldría de las comunes.
    """
    uncommon_flags = {
        client.get("/api/games/paraulogic/hint").json()["is_common"] for _ in range(4)
    }

    assert uncommon_flags == {False}


def test_hint_does_not_reveal_the_word(client: TestClient, db_session: Session) -> None:
    """R-003 y V.6: la pista no revela la palabra.

    Se comprueba contra **todas** las palabras del conjunto, porque una pista
    concreta solo se compararía bien con una.
    """
    words = [word.upper() for word in db_session.scalars(select(ParaulogicWord.word)).all()]

    for _ in range(6):
        body = client.get("/api/games/paraulogic/hint").text.upper()
        leaked = [word for word in words if word in body]
        assert leaked == [], f"La pista ha revelado: {leaked}"


def test_asking_for_hints_does_not_change_the_score(
    client: TestClient, db_session: Session
) -> None:
    """R-003 y V.7: pedir pistas no descuenta puntos (§2.1.5).

    Se pide una pista y se comprueba que no se ha creado ninguna fila de
    puntuación: la única efecto de una pista es la ayuda.
    """
    from app.models.session import Score

    before = db_session.scalar(select(Score).where(Score.game_id == GameId.PARAULOGIC))

    client.get("/api/games/paraulogic/hint")

    after = db_session.scalar(select(Score).where(Score.game_id == GameId.PARAULOGIC))

    assert (before is None) == (after is None)


# --- Wordle (R-004) ----------------------------------------------------------


def test_wordle_returns_no_word_without_a_session(client: TestClient) -> None:
    """R-004 y V.11: sin sesión, la palabra no sale."""
    body = client.get("/api/games/wordle").json()

    assert body["word"] is None
    assert body["already_finished"] is True


def test_wordle_returns_the_word_when_a_game_is_active(
    signed_in: TestClient, db_session: Session
) -> None:
    user_id = _user_id(db_session)
    db_session.add(
        GameSession(
            user_id=user_id, game_id=GameId.WORDLE, status=SessionStatus.ACTIVE
        )
    )
    db_session.commit()

    body = signed_in.get("/api/games/wordle").json()

    assert body["word"] == "LUNAS"
    assert body["already_finished"] is False


def test_wordle_hides_the_word_from_a_player_who_already_finished(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-004 y V.8: quien ya terminó recibe el indicador, no la palabra.

    Wordle se juega una sola vez (§2.1.4). Al volver, se ve el resultado guardado
    (spec 005), no el juego.
    """
    db_session.add(
        GameSession(
            user_id=_user_id(db_session),
            game_id=GameId.WORDLE,
            status=SessionStatus.FINISHED,
        )
    )
    db_session.commit()

    body = signed_in.get("/api/games/wordle").json()

    assert body["word"] is None
    assert body["already_finished"] is True


def test_wordle_word_never_appears_when_already_finished(
    signed_in: TestClient, db_session: Session
) -> None:
    """Comprobación literal, para que el test no dependa de la forma."""
    db_session.add(
        GameSession(
            user_id=_user_id(db_session),
            game_id=GameId.WORDLE,
            status=SessionStatus.FINISHED,
        )
    )
    db_session.commit()

    body = signed_in.get("/api/games/wordle").text.upper()

    assert "LUNAS" not in body


# --- Acertijo (R-005) -------------------------------------------------------


def test_riddle_returns_only_the_question(client: TestClient) -> None:
    """R-005 y V.9: el endpoint no contiene `accepted_answer`."""
    response = client.get("/api/games/riddle")

    assert response.status_code == 200
    assert "question" in response.json()
    assert "accepted_answer" not in response.json()


def test_riddle_does_not_leak_the_answer(client: TestClient, db_session: Session) -> None:
    """V.9: comprobado sobre el cuerpo entero, no sobre un campo."""
    answer = db_session.scalar(select(Riddle.accepted_answer))
    assert answer

    body = client.get("/api/games/riddle").text.upper()

    assert answer.upper() not in body


# --- Errores de validación (R-007) -------------------------------------------


def test_unknown_game_returns_a_plain_message(client: TestClient) -> None:
    """R-007 y §4.1: el error dice qué pasa, sin códigos técnicos."""
    response = client.get("/api/games/no-existe")

    assert response.status_code == 404
    assert "detail" not in response.json()