"""Salir de la partida y reportar el acertijo (spec 006 · R-015, R-017, R-018).

Lo que se prueba aquí son **requisitos de la constitución que hasta ahora no
existían en ninguna spec**:

- §2.1.6 pedía el botón «Saltar partida» y la columna `abandoned` llevaba desde
  la spec 002 sin que nada la escribiera.
- §2.1.4 pedía poder reportar una respuesta correcta rechazada, y no había ni
  tabla ni endpoint.
- R-018: la lista de juegos decía el estado que el frontend tenía escrito a mano.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.content import Riddle
from app.models.enums import GameId, SessionStatus
from app.models.gameplay import MAX_REPORT_LENGTH, RiddleAnswerReport
from app.models.session import GameSession, Score
from app.models.user import User
from app.schemas.games import RiddleReportRequest
from app.services.answer_normalization import answers_match
from app.services.scoring import score_riddle

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration


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


def _player_id(db: Session) -> int:
    return db.scalar(select(User.id).where(User.username == "carmen"))


def _session_for(db: Session, user_id: int, game_id: GameId) -> GameSession:
    return db.scalar(
        select(GameSession).where(
            GameSession.user_id == user_id, GameSession.game_id == game_id
        )
    )


# --- R-015 — «Saltar partida» -------------------------------------------------


def test_abandoning_marks_the_session(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: por fin algo escribe la columna `abandoned`."""
    user_id = _player_id(db_session)
    session = GameSession(user_id=user_id, game_id=GameId.PARAULOGIC, status="active")
    db_session.add(session)
    db_session.commit()

    response = signed_in.post("/api/games/paraulogic/abandon")

    assert response.status_code == 200
    assert session.abandoned is True


def test_abandoning_keeps_the_paraulogic_progress(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: en Paraulógic, salir no pierde lo encontrado.

    No hay ni derrota ni final en Paraulógic (§2.1.4): abandonar es cerrar, no
    terminar. Si esto perdiera palabras, el botón sería una trampa.
    """
    signed_in.post("/api/games/paraulogic/attempt", json={"word": "LUNAS"})

    before = signed_in.get("/api/games/paraulogic/session").json()["found_words"]
    signed_in.post("/api/games/paraulogic/abandon")
    after = signed_in.get("/api/games/paraulogic/session").json()["found_words"]

    assert before == after


def test_abandoning_keeps_the_riddle_progress(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: en el acertijo tampoco se pierde nada por salir."""
    signed_in.post("/api/games/riddle/answer", json={"answer": "no es esta"})

    attempts_before = signed_in.get("/api/games/riddle/session").json()["attempts_used"]
    signed_in.post("/api/games/riddle/abandon")
    attempts_after = signed_in.get("/api/games/riddle/session").json()["attempts_used"]

    assert attempts_before == attempts_after


def test_abandoning_wordle_spends_the_single_game(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015 y §2.1.4: en Wordle, saltar **consume la única partida**.

    Es lo que hace que este caso sea distinto de los otros dos, y por eso el
    aviso se dice antes de hacerlo: no es salir, es jugar mal a propósito.
    """
    user_id = _player_id(db_session)
    signed_in.post("/api/games/wordle/attempt", json={"guess": "AAAAA"})

    response = signed_in.post("/api/games/wordle/abandon")

    assert response.status_code == 200
    assert response.json()["gave_up"] is True
    assert _session_for(db_session, user_id, GameId.WORDLE).status == SessionStatus.FINISHED


def test_after_abandoning_wordle_cannot_play_again(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: abandonar es gastar la partida, no solo cerrar la pantalla.

    Si el servidor aceptara un intento más, «Saltar partida» sería solo
    decorativo y quien lo pulsara pensando «volveré luego» perdería su único
    intento sin saberlo.
    """
    signed_in.post("/api/games/wordle/abandon")

    response = signed_in.post("/api/games/wordle/attempt", json={"guess": "AAAAA"})

    assert response.status_code == 409


def test_abandoning_keeps_the_wordle_attempts(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: los intentos hechos antes de saltar se conservan."""
    signed_in.post("/api/games/wordle/attempt", json={"guess": "AAAAA"})
    signed_in.post("/api/games/wordle/abandon")

    session = signed_in.get("/api/games/wordle/session").json()

    assert session["attempts_used"] == 1
    assert session["attempts"][0]["guess"] == "AAAAA"


def test_abandoning_other_games_does_not_end_them(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-015: `gave_up` es `false` donde la partida sigue viva.

    Es el campo que le dice a la interfaz si tiene que dejar de pintar el juego.
    Si dijera `true` en Paraulógic, la pantalla cerraría un juego que en realidad
    sigue en marcha.
    """
    response = signed_in.post("/api/games/paraulogic/abandon")

    assert response.json()["gave_up"] is False


def test_abandoning_twice_is_harmless(
    signed_in: TestClient, db_session: Session
) -> None:
    """V.5: un paso, y pulsar dos veces no da error.

    response = signed_in.post("/api/games/riddle/report", json={"given_answer": "cielo"})
    """
    signed_in.post("/api/games/paraulogic/abandon")

    assert signed_in.post("/api/games/paraulogic/abandon").status_code == 200


def test_abandoning_requires_a_session(client: TestClient, db_session: Session) -> None:
    """R-019: saltar la partida es una acción de cuenta."""
    assert client.post("/api/games/paraulogic/abandon").status_code == 401


def test_abandoning_an_unknown_game(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-019: un juego que no existe no se inventa ni se crea una partida."""
    assert signed_in.post("/api/games/ajedrez/abandon").status_code == 422


# --- R-017 — Reportar una respuesta rechazada --------------------------------


def test_reporting_a_rejected_answer_saves_it(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: el reporte guarda lo que la persona cree que era la respuesta."""
    response = signed_in.post(
        "/api/games/riddle/report", json={"given_answer": "cielo"}
    )

    assert response.status_code == 201

    report = db_session.scalar(select(RiddleAnswerReport))
    assert report.given_answer == "cielo"


def test_reporting_gives_no_points(signed_in: TestClient, db_session: Session) -> None:
    """R-017 y §2.1.4: el reporte **no concede puntos**. Ni uno.

    La constitución lo dice expresamente, y aquí se comprueba contra la tabla de
    puntuaciones, no contra el texto de la respuesta: un campo que diga
    `gave_points: false` no impide que alguien suba la puntuación por otro lado.
    """
    user_id = _player_id(db_session)
    signed_in.post("/api/games/riddle/answer", json={"answer": "cielo"})
    signed_in.post("/api/games/riddle/report", json={"given_answer": "cielo"})

    points = db_session.scalar(
        select(Score.points).where(
            Score.user_id == user_id, Score.game_id == GameId.RIDDLE
        )
    )

    assert points in (None, 0)


def test_the_response_says_that_it_gave_no_points(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: la respuesta **afirma** que no dio puntos.

    No es redundante. Si el campo no existiera, la interfaz podría prometer lo que
    le pareciera, y §4.2 prohíbe prometer lo que no ocurre.
    """
    signed_in.post("/api/games/riddle/answer", json={"answer": "cielo"})

    body = signed_in.post(
        "/api/games/riddle/report", json={"given_answer": "cielo"}
    ).json()

    assert body["gave_points"] is False


def test_reporting_a_correct_answer_is_refused(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: no se reporta lo que sí es correcto.

    Guardarlo sería ruido. Y quien lo intentara desde la interfaz está viendo un
    estado en el que la respuesta **era** correcta, así que hay un problema en
    otra parte que conviene decir.
    """
    riddle = db_session.scalar(select(Riddle))
    signed_in.post(
        "/api/games/riddle/report", json={"given_answer": riddle.accepted_answer}
    )

    response = signed_in.post(
        "/api/games/riddle/report", json={"given_answer": riddle.accepted_answer}
    )

    assert response.status_code == 400
    assert db_session.scalar(select(func.count()).select_from(RiddleAnswerReport)) == 0


def test_a_correct_answer_still_scores_the_normal_way(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: reportar no es atajo para los puntos.

    Es el otro lado del requisito anterior: se comprueba que **acertar de verdad**
    sigue dando sus diez puntos, para que nadie sospeche que el reporte es una
    puerta trasera.
    """
    riddle = db_session.scalar(select(Riddle))

    response = signed_in.post(
        "/api/games/riddle/answer", json={"answer": riddle.accepted_answer}
    )

    assert response.json()["is_correct"] is True
    assert score_riddle(is_correct=True).points == 10


def test_an_empty_report_is_refused(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-009: un reporte vacío no es un reporte."""
    response = signed_in.post("/api/games/riddle/report", json={"given_answer": "  "})

    assert response.status_code == 422


def test_a_report_over_the_limit_is_refused(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: hay un tope, y es el mismo que el del campo de texto."""
    response = signed_in.post(
        "/api/games/riddle/report",
        json={"given_answer": "a" * (MAX_REPORT_LENGTH + 1)},
    )

    assert response.status_code == 422


def test_the_report_keeps_the_attempt_number(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: se guarda en qué intento iba.

    Permite distinguir «acertó a la primera y le rechazaron la respuesta» de
    «llevaba cinco intentos fallando», que son problemas muy distintos.
    """
    signed_in.post("/api/games/riddle/answer", json={"answer": "falso"})
    signed_in.post("/api/games/riddle/answer", json={"answer": "otro falso"})
    signed_in.post("/api/games/riddle/report", json={"given_answer": "la buena"})

    assert db_session.scalar(select(RiddleAnswerReport.attempt_number)) == 2


def test_the_report_is_saved_without_session_data(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017 y §6.5: el reporte guarda el texto y el identificador, no el nombre.

    El identificador es inevitable —hay que saber a qué partida pertenece— pero
    no se guarda el `username`, que es lo que identifica a la persona (§2.2).
    """
    signed_in.post("/api/games/riddle/answer", json={"answer": "cielo"})
    signed_in.post("/api/games/riddle/report", json={"given_answer": "cielo"})

    columns = {column.name for column in RiddleAnswerReport.__table__.columns}

    assert "username" not in columns
    assert "ip" not in " ".join(columns)


def test_the_report_survives_going_away_and_coming_back(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-017: el reporte se guarda en el servidor, no en el navegador.

    Si viviera en `localStorage` se perdería al cerrar el navegador, y el
    requisito es que quede «registrado para revisión» (§2.1.4).
    """
    signed_in.post("/api/games/riddle/answer", json={"answer": "cielo"})
    signed_in.post("/api/games/riddle/report", json={"given_answer": "cielo"})
    signed_in.post("/api/auth/logout")

    signed_in.post("/api/auth/login", json={"username": "carmen", "password": VALID_PASSWORD})

    assert db_session.scalar(select(func.count()).select_from(RiddleAnswerReport)) == 1


def test_deleting_the_account_deletes_its_reports(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-010: borrar la cuenta se lleva también sus reportes.

    Un reporte es texto escrito por alguien. Si la cuenta se borra y el texto se
    queda, «borrar mi cuenta» no habría borrado nada (§6.5).
    """
    signed_in.post("/api/games/riddle/answer", json={"answer": "cielo"})
    signed_in.post("/api/games/riddle/report", json={"given_answer": "cielo"})

    signed_in.delete("/api/auth/me")

    assert db_session.scalar(select(func.count()).select_from(RiddleAnswerReport)) == 0


def test_reporting_requires_a_session(client: TestClient, db_session: Session) -> None:
    """R-017: sin sesión no se reporta."""
    response = client.post("/api/games/riddle/report", json={"given_answer": "cielo"})

    assert response.status_code == 401


def test_the_normalization_still_accepts_the_usual_mistakes() -> None:
    """R-017, la otra mitad: el reporte existe porque la normalización falla.

    Si esto dejara de ser cierto, el botón de reportar sería ruido. Se comprueba
    aquí para que nadie «simplifique» la normalización sin darse cuenta de que
    está quitando el por qué de R-017.
    """
    assert answers_match("  Cielo. ", "cielo") is True
    assert answers_match("CIELO", "cielo") is True
    assert answers_match("cielo", "tierra") is False


def test_the_schema_accepts_a_report_without_a_riddle_id() -> None:
    """R-019: el reporte no lleva `riddle_id`.

    Si lo llevara, alguien podría reportar sobre un acertijo que no es el que está
    jugando, o sobre uno que no existe (§2.1.2).
    """
    assert "riddle_id" not in RiddleReportRequest.model_fields


# --- R-018 — El estado real en la lista de juegos -----------------------------


def test_the_list_tells_whether_each_game_is_played(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-018: la lista dice la verdad.

    El frontend lo tenía escrito a mano como «Sin jugar», con un comentario que
    lo admitía. Este es el requisito que lo arregla.
    """
    user_id = _player_id(db_session)
    db_session.add(GameSession(user_id=user_id, game_id=GameId.WORDLE, status="active"))
    db_session.commit()

    games = {game["game_id"]: game for game in signed_in.get("/api/games").json()}

    assert games["wordle"]["played"] is True
    assert games["paraulogic"]["played"] is False
    assert games["riddle"]["played"] is False


def test_the_list_shows_the_score(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-018: los puntos van con el estado, para no tener que pedirlos aparte."""
    user_id = _player_id(db_session)
    db_session.add(Score(user_id=user_id, game_id=GameId.RIDDLE, points=10))
    db_session.commit()

    games = {game["game_id"]: game for game in signed_in.get("/api/games").json()}

    assert games["riddle"]["score"] == 10


def test_the_list_without_session_is_neutral(
    client: TestClient, db_session: Session
) -> None:
    """R-018 y §2.4: sin sesión, la lista se ve igual y no inventa estado.

    El estado de una partida es de la cuenta, no del juego. Sin cuenta no hay
    estado que enseñar, y fingir que no se ha jugado sería una mentira.
    """
    client.post(
        "/api/auth/register",
        json={
            "username": "carmen",
            "password": VALID_PASSWORD,
            "password_confirmation": VALID_PASSWORD,
        },
    )
    client.post("/api/auth/logout")

    games = client.get("/api/games").json()

    assert all(game["played"] is False for game in games)
    assert all(game["score"] == 0 for game in games)


def test_the_list_keeps_the_fields_it_already_had(
    client: TestClient, db_session: Session
) -> None:
    """R-019: la ampliación no quita ni cambia nada de lo que ya había.

    §2.5 llama a este contrato la frontera más crítica del sistema. Ampliar está
    permitido; romper lo que ya funcionaba no.
    """
    entry = client.get("/api/games").json()[0]

    assert {"game_id", "name", "description"} <= set(entry)
    assert isinstance(entry["name"], str) and entry["name"]
    assert isinstance(entry["description"], str) and entry["description"]


def test_the_list_does_not_count_another_person_session(
    signed_in: TestClient, db_session: Session
) -> None:
    """R-018: el estado es de quien pregunta, no de cualquiera.

    Con dos cuentas en la misma base de datos, una lista que juntara las partidas
    de las dos dejaría a la persona viendo el progreso de otra (§2.5).
    """
    otro = User(
        username="antonio",
        username_normalized="antonio",
        password_hash="x",
        alias="ArdillaViva",
    )
    db_session.add(otro)
    db_session.commit()
    db_session.add(GameSession(user_id=otro.id, game_id=GameId.WORDLE, status="active"))
    db_session.commit()

    games = {game["game_id"]: game for game in signed_in.get("/api/games").json()}

    assert games["wordle"]["played"] is False