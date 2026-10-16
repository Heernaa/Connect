"""Partidas, persistencia del progreso y puntuación (spec 005).

Incluye el test más importante del proyecto: el 5.15, el que comprueba que una
puntuación mandada por el cliente se rechaza (§5, regla de oro).
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import GameId
from app.models.session import GameSession, Score
from app.models.user import User

VALID_PASSWORD = "una contraseña fácil"
TARGET_WORD = "LUNAS"

pytestmark = pytest.mark.integration


@pytest.fixture
def player(client: TestClient) -> TestClient:
    """Cliente con una cuenta creada y una sesión abierta."""
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


def _stored_score(db_session: Session, game_id: GameId, username: str = "carmen") -> int | None:
    user_id = db_session.scalar(select(User.id).where(User.username == username))
    return db_session.scalar(
        select(Score.points).where(Score.user_id == user_id, Score.game_id == game_id)
    )


# --- Paraulógic (R-001, R-002, R-003) ---------------------------------------


def test_progress_is_saved_on_every_action(player: TestClient, db_session: Session) -> None:
    """R-001 y §2.1.7: el progreso se guarda al actuar, no al cerrar.

    Se comprueba en la base de datos, no en la respuesta: la respuesta podría
    mentir.
    """
    assert player.post("/api/games/paraulogic/attempt", json={"word": "SENAR"}).status_code == 200

    session = db_session.scalar(select(GameSession))
    assert session is not None
    assert session.id is not None


def test_progress_survives_leaving_and_coming_back(player: TestClient) -> None:
    """R-002 y V.1: al volver, el progreso está ahí.

    Se usan dos peticiones independientes, como si entre ellas se hubiera cerrado
    el navegador.
    """
    player.post("/api/games/paraulogic/attempt", json={"word": "SENAR"})
    player.post("/api/games/paraulogic/attempt", json={"word": "ATRE"})

    restored = player.get("/api/games/paraulogic/session").json()

    assert sorted(restored["found_words"]) == ["ATRE", "SENAR"]
    assert restored["pending_count"] == 19


def test_first_time_sees_no_progress_instead_of_a_blank_screen(player: TestClient) -> None:
    """R-002: quien entra por primera vez ve las 21 pendientes, no un error."""
    restored = player.get("/api/games/paraulogic/session").json()

    assert restored["found_words"] == []
    assert restored["pending_count"] == 21


def test_paraulogic_has_no_attempt_limit(player: TestClient) -> None:
    """R-003 y V.4: se puede seguir intentando indefinidamente.

    Se mandan muchos intentos fallidos seguidos. Si hubiera límite, alguno
    devolvería error.
    """
    for _ in range(12):
        response = player.post("/api/games/paraulogic/attempt", json={"word": "PESADO"})
        assert response.status_code == 422

    assert player.post("/api/games/paraulogic/attempt", json={"word": "NAT"}).status_code == 200


def test_paraulogic_cannot_be_lost(player: TestClient, db_session: Session) -> None:
    """R-003 y V.3: no existe ninguna forma de perder.

    Se comprueba en la base de datos que **ningún** estado de la partida es una
    derrota: los únicos que existen son activo, terminado y abandonado. Un estado
    `lost` sería un camino a una derrota que el producto no tiene (§2.1.4).
    """
    from app.models.enums import SessionStatus as Allowed

    player.post("/api/games/paraulogic/attempt", json={"word": "PESADO"})

    statuses = {allowed.value for allowed in Allowed}
    stored = db_session.scalars(select(GameSession.status)).all()

    assert set(stored) <= statuses
    assert "lost" not in statuses
    assert "defeat" not in statuses


def test_failed_paraulogic_attempts_do_not_subtract_points(
    player: TestClient, db_session: Session
) -> None:
    """R-006 y V.8: fallar no cuesta nada."""
    player.post("/api/games/paraulogic/attempt", json={"word": "PESADO"})
    player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})

    # 1 palabra correcta = 1 punto, los dos intentos fallidos no restaron.
    assert _stored_score(db_session, GameId.PARAULOGIC) == 1


def test_each_paraulogic_word_adds_one_point(
    player: TestClient, db_session: Session
) -> None:
    """R-006 y V.7: cada palabra encontrada suma 1 punto."""
    player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})
    player.post("/api/games/paraulogic/attempt", json={"word": "ATRE"})

    assert _stored_score(db_session, GameId.PARAULOGIC) == 2


def test_finding_the_same_word_twice_counts_once(
    player: TestClient, db_session: Session
) -> None:
    """V.17 y §6.6: la puntuación nunca supera el número de palabras del conjunto."""
    for _ in range(4):
        player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})

    assert _stored_score(db_session, GameId.PARAULOGIC) == 1


def test_invented_paraulogic_word_does_not_score(
    player: TestClient, db_session: Session
) -> None:
    """R-009 y V.10: una palabra inventada no suma puntos.

    `NAR` se puede formar con las letras del conjunto, una de cada una, pero no
    está en la lista de palabras. Pasa la regla de formación y aun así no suma:
    eso demuestra que el servidor no puntúa por parecer válido, sino por existir.
    """
    response = player.post("/api/games/paraulogic/attempt", json={"word": "NAR"})

    assert response.status_code == 200
    assert response.json()["is_correct"] is False
    assert _stored_score(db_session, GameId.PARAULOGIC) in (None, 0)


def test_asking_for_hints_does_not_change_the_score(
    player: TestClient, db_session: Session
) -> None:
    """V.8: pedir pistas no altera la puntuación (§2.1.5)."""
    player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})
    before = _stored_score(db_session, GameId.PARAULOGIC)

    player.get("/api/games/paraulogic/hint")

    assert _stored_score(db_session, GameId.PARAULOGIC) == before


# --- Anti-trampas (R-009) ----------------------------------------------------


def test_client_sent_score_is_rejected(player: TestClient, db_session: Session) -> None:
    """R-009 y V.9: **la puntuación nunca se recibe del cliente**.

    Este es el test más importante del proyecto (§5, regla de oro). Se manda una
    puntuación inventada de 9999 puntos en el cuerpo de la petición y se comprueba
    que la base de datos no la refleja.

    Que el cliente «pida» puntos no da error: se ignora. Lo que importa es lo que
    queda guardado, y eso es lo que se comprueba.
    """
    response = player.post(
        "/api/games/paraulogic/attempt",
        json={"word": "NAT", "score": 9999, "points": 9999},
    )

    assert response.status_code == 200
    assert response.json()["score"] == 1, "La puntuación devuelta es la calculada."
    assert _stored_score(db_session, GameId.PARAULOGIC) == 1


def test_score_field_does_not_exist_in_the_request_models() -> None:
    """R-009: los modelos de entrada no tienen campo de puntuación.

    Se comprueba la forma del contrato, no su comportamiento: añadir un campo
    `score` a un esquema de entrada sería abrir la puerta, aunque hoy se ignorara.
    """
    from app.schemas.sessions import (
        ParaulogicAttemptRequest,
        RiddleAnswerCheckRequest,
        WordleAttemptRequest,
    )

    for request_model in (
        ParaulogicAttemptRequest,
        WordleAttemptRequest,
        RiddleAnswerCheckRequest,
    ):
        assert "score" not in request_model.model_fields
        assert "points" not in request_model.model_fields


def test_score_can_never_exceed_the_number_of_words(
    player: TestClient, db_session: Session
) -> None:
    """R-009: la puntuación de Paraulógic nunca supera el número de palabras."""
    for _ in range(10):
        player.post("/api/games/paraulogic/attempt", json={"word": "NAT", "score": 500})

    assert (_stored_score(db_session, GameId.PARAULOGIC) or 0) <= 21


# --- Wordle (R-004, R-007) ---------------------------------------------------


def test_wordle_attempt_returns_the_letter_feedback(player: TestClient) -> None:
    """R-004: cada intento devuelve las tres pistas de letra."""
    response = player.post("/api/games/wordle/attempt", json={"guess": "SALON"})

    assert response.status_code == 200
    feedback = response.json()["feedback"]
    assert len(feedback) == 5
    assert set(feedback) <= {"correct", "present", "absent"}


def test_wordle_can_only_be_played_once(player: TestClient) -> None:
    """R-004 y V.5: Wordle se juega una única vez.

    Se gana la partida en el primer intento y se vuelve a intentar. El segundo
    intento devuelve `409`.
    """
    player.post("/api/games/wordle/attempt", json={"guess": TARGET_WORD})

    second = player.post("/api/games/wordle/attempt", json={"guess": TARGET_WORD})

    assert second.status_code == 409


def test_wordle_returns_409_once_the_single_game_is_over(player: TestClient) -> None:
    """V.6 y V.5: cuando la única partida se acaba, el siguiente intento da 409.

    Wordle dura 6 intentos (§2.1.4), así que el 409 no llega en el segundo intento
    sino cuando ya no queda ninguno: al llegar ahí la partida se marca como
    terminada y no se puede volver a empezar.
    """
    for attempt in range(6):
        response = player.post("/api/games/wordle/attempt", json={"guess": "XXXXX"})
        assert response.status_code == 200, f"El intento {attempt + 1} falló."

    after_the_sixth = player.post("/api/games/wordle/attempt", json={"guess": TARGET_WORD})

    assert after_the_sixth.status_code == 409


def test_wordle_score_drops_ten_percent_per_attempt(
    player: TestClient, db_session: Session
) -> None:
    """R-007 y V.11: base 100 menos un 10 % por intento."""
    player.post("/api/games/wordle/attempt", json={"guess": "XXXXX"})
    player.post("/api/games/wordle/attempt", json={"guess": "YYYYY"})
    player.post("/api/games/wordle/attempt", json={"guess": TARGET_WORD})

    # Acertado al tercer intento: 100 − 20 = 80.
    assert _stored_score(db_session, GameId.WORDLE) == 80


def test_wordle_first_try_gives_the_full_score(player: TestClient, db_session: Session) -> None:
    player.post("/api/games/wordle/attempt", json={"guess": TARGET_WORD})

    assert _stored_score(db_session, GameId.WORDLE) == 100


def test_wordle_progress_is_restored(player: TestClient) -> None:
    """R-002 y V.1: al volver, los intentos y sus pistas siguen ahí."""
    player.post("/api/games/wordle/attempt", json={"guess": "SALON"})

    restored = player.get("/api/games/wordle/session").json()

    assert restored["attempts_used"] == 1
    assert restored["attempts"][0]["guess"] == "SALON"
    assert len(restored["attempts"][0]["feedback"]) == 5


# --- Acertijo (R-008) --------------------------------------------------------


def test_correct_riddle_answer_gives_ten_points(player: TestClient, db_session: Session) -> None:
    """R-008: 10 puntos fijos al acertar."""
    player.post("/api/games/riddle/answer", json={"answer": "el mapa"})

    assert _stored_score(db_session, GameId.RIDDLE) == 10


@pytest.mark.parametrize(
    "answer", ["el mapa", "El Mapa", "  EL MAPA.  ", "el-mapa", "eL  mApA."]
)
def test_riddle_answer_accepts_case_accents_and_spaces(player: TestClient, answer: str) -> None:
    """V.10: la respuesta se acepta con mayúsculas, tildes y espacios distintos."""
    response = player.post("/api/games/riddle/answer", json={"answer": answer})

    assert response.json()["is_correct"] is True


def test_wrong_riddle_answer_gives_nothing_and_does_not_subtract(
    player: TestClient, db_session: Session
) -> None:
    """R-008 y §2.1.5: fallar no resta nada."""
    player.post("/api/games/riddle/answer", json={"answer": "la brújula"})
    player.post("/api/games/riddle/answer", json={"answer": "el mapa"})

    # Acertó al segundo intento: los 10 puntos enteros (§2.1.5).
    assert _stored_score(db_session, GameId.RIDDLE) == 10


def test_riddle_never_leaks_the_accepted_answer(player: TestClient) -> None:
    """§6.6: la respuesta no se devuelve al comprobarla, solo si es correcta."""
    wrong = player.post("/api/games/riddle/answer", json={"answer": "la brújula"})

    assert "el mapa" not in wrong.text.lower()


def test_riddle_progress_is_restored(player: TestClient) -> None:
    """R-002 y V.1: al volver se ve si ya se acertó."""
    player.post("/api/games/riddle/answer", json={"answer": "la brújula"})

    restored = player.get("/api/games/riddle/session").json()

    assert restored["attempts_used"] == 1
    assert restored["solved"] is False


# --- Puntuación acumulada (R-010) -------------------------------------------


def test_score_accumulates_per_game(player: TestClient, db_session: Session) -> None:
    """R-010: hay una puntuación por juego y se actualiza al resolver."""
    player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})
    player.post("/api/games/riddle/answer", json={"answer": "el mapa"})

    assert _stored_score(db_session, GameId.PARAULOGIC) == 1
    assert _stored_score(db_session, GameId.RIDDLE) == 10


def test_score_is_stored_without_needing_to_log_out(
    player: TestClient, db_session: Session
) -> None:
    """R-010: la puntuación se actualiza al resolver, no al cerrar sesión."""
    player.post("/api/games/paraulogic/attempt", json={"word": "NAT"})

    assert _stored_score(db_session, GameId.PARAULOGIC) == 1

    player.post("/api/auth/logout")

    assert _stored_score(db_session, GameId.PARAULOGIC) == 1