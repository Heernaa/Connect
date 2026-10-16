"""Partidas: iniciar, guardar el progreso y puntuar (§2.1.7, R-001 a R-010).

Dos ideas atraviesan todo el archivo:

- **El progreso se guarda en el servidor en cada acción**, no al cerrar la
  pestaña. Si el navegador se cierra o el dispositivo falla, no se pierde nada
  (§2.1.7).
- **La puntuación se calcula aquí, siempre.** El cliente puede decir qué ha
  hecho; nunca cuánto vale (§6.6).
"""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_current_user
from app.errors import (
    ANSWER_WAS_CORRECT,
    GAME_LEFT,
    NOTHING_TO_SHOW,
    REPORT_SAVED,
    UNPROCESSABLE_CONTENT,
    ApiError,
)
from app.models.content import ParaulogicSet, ParaulogicWord, Riddle, WordleWord
from app.models.enums import GameId, LetterFeedback, SessionStatus
from app.models.gameplay import RiddleAnswerReport
from app.models.session import (
    GameSession,
    ParaulogicFoundWord,
    RiddleAnswer,
    Score,
    WordleAttempt,
)
from app.models.user import User
from app.schemas.games import (
    AbandonResponse,
    RiddleAnswerCheck,
    RiddleReportRequest,
    RiddleReportResponse,
)
from app.schemas.sessions import (
    AttemptResponse,
    ParaulogicAttemptRequest,
    ParaulogicAttemptResponse,
    RiddleAnswerCheckRequest,
    SessionStateResponse,
    WordleAttemptRequest,
)
from app.services.answer_normalization import answers_match
from app.services.paraulogic_rules import InvalidWordError, validate_word
from app.services.scoring import (
    score_paraulogic,
    score_riddle,
    score_wordle,
)
from app.services.wordle_feedback import (
    MAX_ATTEMPTS,
    compute_feedback,
    decode_feedback,
    encode_feedback,
)

router = APIRouter(tags=["games"])


# --- Utilidades internas -----------------------------------------------------


def _upsert_score(db: Session, user_id: int, game_id: GameId, points: int) -> None:
    """Guarda la puntuación del jugador en un juego.

    Se escribe el **valor calculado**, nunca uno recibido (§6.6). Si no había fila
    se crea; si había, se actualiza. La puntuación acumulada se actualiza al
    resolver, no al cerrar sesión (R-010).
    """
    existing = db.scalar(
        select(Score).where(Score.user_id == user_id, Score.game_id == game_id)
    )

    if existing is None:
        db.add(Score(user_id=user_id, game_id=game_id, points=points))
    else:
        existing.points = points


def _get_or_create_session(
    db: Session, user_id: int, game_id: GameId
) -> tuple[GameSession, bool]:
    """Devuelve la partida del jugador, creándola si no existe.

    El segundo valor dice si se acaba de crear, para que quien llama sepa si
    empieza o continúa.
    """
    existing = db.scalar(
        select(GameSession).where(
            GameSession.user_id == user_id, GameSession.game_id == game_id
        )
    )
    if existing is not None:
        return existing, False

    created = GameSession(user_id=user_id, game_id=game_id, status=SessionStatus.ACTIVE)
    db.add(created)
    db.commit()
    db.refresh(created)
    return created, True


# --- Paraulógic (R-001, R-002, R-003) ---------------------------------------


@router.get(
    "/games/paraulogic/session",
    response_model=SessionStateResponse,
    summary="Recupera la partida de Paraulógic",
)
def get_paraulogic_session(
    user: User = Depends(require_current_user), db: Session = Depends(get_db)
) -> SessionStateResponse:
    """Devuelve lo encontrado y lo que falta, sin empezar de cero (§2.1.4).

    Quien vuelve ve exactamente dónde lo dejó. Nunca aparece como si fuera la
    primera vez sin avisar.
    """
    session, _ = _get_or_create_session(db, user.id, GameId.PARAULOGIC)
    paraulogic_set = db.scalar(select(ParaulogicSet).limit(1))

    all_words = db.scalars(
        select(ParaulogicWord).where(ParaulogicWord.set_id == paraulogic_set.id)
    ).all()
    found_ids = set(
        db.scalars(
            select(ParaulogicFoundWord.word_id).where(
                ParaulogicFoundWord.session_id == session.id
            )
        ).all()
    )

    found = [word.word for word in all_words if word.id in found_ids]
    missing_count = len(all_words) - len(found)

    return SessionStateResponse(
        game_id=GameId.PARAULOGIC,
        status=session.status,
        found_words=found,
        pending_count=missing_count,
        score=db.scalar(
            select(Score.points).where(
                Score.user_id == user.id, Score.game_id == GameId.PARAULOGIC
            )
        )
        or 0,
    )


@router.post(
    "/games/paraulogic/attempt",
    response_model=ParaulogicAttemptResponse,
    summary="Registra una palabra de Paraulógic",
)
def submit_paraulogic_word(
    payload: ParaulogicAttemptRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> ParaulogicAttemptResponse:
    """Comprueba y guarda la palabra escrita (R-003).

    Intentos **ilimitados** y **sin estado de derrota** (§2.1.4). Una palabra
    inventada no suma puntos, pero tampoco penaliza: fallar aquí no cuesta nada,
    porque no hay nada que perder.

    La palabra se valida contra la base de datos. Si existe y encaja con las
    letras, se registra como encontrada y se guarda **en el acto** (§2.1.7).
    """
    paraulogic_set = db.scalar(select(ParaulogicSet).limit(1))

    try:
        normalized_word = validate_word(payload.word, paraulogic_set.letters)
    except InvalidWordError as error:
        # No es un fallo de la aplicación: es alguien escribiendo mal. Se
        # responde 422 con el motivo en claro, sin puntos y sin penalización.
        raise ApiError(str(error), UNPROCESSABLE_CONTENT) from error

    session, _ = _get_or_create_session(db, user.id, GameId.PARAULOGIC)

    word = db.scalar(
        select(ParaulogicWord).where(
            ParaulogicWord.set_id == paraulogic_set.id, ParaulogicWord.word == normalized_word
        )
    )

    if word is None:
        # Palabra que no existe en el conjunto. No suma, no resta y no se guarda:
        # es el intento fallido de una partida que no tiene límite (§2.1.4).
        return ParaulogicAttemptResponse(
            is_correct=False, score=_current_score(db, user.id, GameId.PARAULOGIC)
        )

    already_found = db.scalar(
        select(ParaulogicFoundWord.id).where(
            ParaulogicFoundWord.session_id == session.id,
            ParaulogicFoundWord.word_id == word.id,
        )
    )
    if already_found is None:
        db.add(ParaulogicFoundWord(session_id=session.id, word_id=word.id))
        db.commit()

    # La puntuación se recalcula desde las palabras **registradas**, nunca desde
    # lo que diga la petición (§6.6).
    found_count = db.scalar(
        select(func.count())
        .select_from(ParaulogicFoundWord)
        .where(ParaulogicFoundWord.session_id == session.id)
    )
    breakdown = score_paraulogic(found_count or 0)
    _upsert_score(db, user.id, GameId.PARAULOGIC, breakdown.points)
    db.commit()

    return ParaulogicAttemptResponse(
        is_correct=True,
        score=breakdown.points,
        correct_word=word.word,
        found_words=found_count,
    )


def _current_score(db: Session, user_id: int, game_id: GameId) -> int:
    """Puntuación guardada del jugador en un juego, o cero."""
    return (
        db.scalar(select(Score.points).where(Score.user_id == user_id, Score.game_id == game_id))
        or 0
    )


# --- Wordle (R-004) ----------------------------------------------------------


@router.get(
    "/games/wordle/session",
    response_model=SessionStateResponse,
    summary="Recupera la partida de Wordle",
)
def get_wordle_session(
    user: User = Depends(require_current_user), db: Session = Depends(get_db)
) -> SessionStateResponse:
    """Devuelve los intentos hechos y la pista de cada letra (§2.1.4, R-002)."""
    session, _ = _get_or_create_session(db, user.id, GameId.WORDLE)

    attempts = db.scalars(
        select(WordleAttempt)
        .where(WordleAttempt.session_id == session.id)
        .order_by(WordleAttempt.attempt_number)
    ).all()

    return SessionStateResponse(
        game_id=GameId.WORDLE,
        status=session.status,
        attempts_used=len(attempts),
        max_attempts=MAX_ATTEMPTS,
        attempts=[_restore_attempt(attempt) for attempt in attempts],
        score=_current_score(db, user.id, GameId.WORDLE),
    )


def _restore_attempt(attempt: WordleAttempt) -> AttemptResponse:
    """Vuelve a montar un intento guardado para devolverlo tal cual estaba.

    Se reconstruye desde la pista guardada, no desde la palabra secreta: así el
    servidor no necesita volver a mirar la palabra para poder mostrar cómo iba
    la partida.
    """
    feedback = decode_feedback(attempt.feedback)

    return AttemptResponse(
        attempt_number=attempt.attempt_number,
        guess=attempt.guess,
        feedback=[item.value for item in feedback],
        solved=all(item is LetterFeedback.CORRECT for item in feedback),
        score=0,
    )


@router.post(
    "/games/wordle/attempt",
    response_model=AttemptResponse,
    summary="Registra un intento de Wordle",
)
def submit_wordle_attempt(
    payload: WordleAttemptRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> AttemptResponse:
    """Comprueba el intento, devuelve la pista de cada letra y puntúa (R-004).

    Wordle se juega **una sola vez** (§2.1.4). Un segundo intento devuelve `409`,
    que es la forma de decir «esta partida ya la has jugado».
    """
    session, _ = _get_or_create_session(db, user.id, GameId.WORDLE)

    if session.status != SessionStatus.ACTIVE:
        raise ApiError(
            "Ya has jugado tu partida de Wordle. Puedes ver el resultado.",
            status.HTTP_409_CONFLICT,
        )

    attempts_used = db.scalar(
        select(func.count())
        .select_from(WordleAttempt)
        .where(WordleAttempt.session_id == session.id)
    ) or 0

    if attempts_used >= MAX_ATTEMPTS:
        raise ApiError(
            "No te quedan intentos en esta partida.",
            status.HTTP_409_CONFLICT,
        )

    target = db.scalar(select(WordleWord).order_by(WordleWord.id).limit(1))
    if target is None:
        raise ApiError("Ahora mismo no hay partida disponible.", status.HTTP_404_NOT_FOUND)

    guess = payload.guess.strip().upper()
    feedback = compute_feedback(target.word, guess)

    attempt = WordleAttempt(
        session_id=session.id,
        attempt_number=attempts_used + 1,
        guess=guess,
        feedback=encode_feedback(feedback),
    )
    db.add(attempt)

    solved = all(item.value == "correct" for item in feedback)

    if solved:
        breakdown = score_wordle(attempts_used + 1)
        _upsert_score(db, user.id, GameId.WORDLE, breakdown.points)
        session.status = SessionStatus.FINISHED
        session.finished_at = datetime.now(UTC)
    elif attempts_used + 1 >= MAX_ATTEMPTS:
        # Se acaban los intentos: la partida termina sin acertar, pero no es una
        # derrota con estado de derrota. Se conserva lo hecho.
        session.status = SessionStatus.FINISHED
        session.finished_at = datetime.now(UTC)

    db.commit()

    return AttemptResponse(
        attempt_number=attempts_used + 1,
        guess=guess,
        feedback=[item.value for item in feedback],
        solved=solved,
        score=_current_score(db, user.id, GameId.WORDLE),
    )


# --- Acertijo (R-002, R-008) -------------------------------------------------


@router.get(
    "/games/riddle/session",
    response_model=SessionStateResponse,
    summary="Recupera la partida del acertijo",
)
def get_riddle_session(
    user: User = Depends(require_current_user), db: Session = Depends(get_db)
) -> SessionStateResponse:
    """Devuelve si ya se acertó y cuántos intentos se hicieron (§2.1.4)."""
    session, _ = _get_or_create_session(db, user.id, GameId.RIDDLE)

    attempts = db.scalars(
        select(RiddleAnswer)
        .where(RiddleAnswer.session_id == session.id)
        .order_by(RiddleAnswer.attempt_number)
    ).all()

    return SessionStateResponse(
        game_id=GameId.RIDDLE,
        status=session.status,
        attempts_used=len(attempts),
        solved=any(attempt.is_correct for attempt in attempts),
        score=_current_score(db, user.id, GameId.RIDDLE),
    )


@router.post(
    "/games/riddle/answer",
    response_model=RiddleAnswerCheck,
    summary="Comprueba la respuesta del acertijo",
)
def submit_riddle_answer(
    payload: RiddleAnswerCheckRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> RiddleAnswerCheck:
    """Comprueba la respuesta **en el servidor** y guarda el intento (R-008).

    La comparación es tolerante con mayúsculas, tildes, puntuación y espacios de
    más: son los errores más frecuentes a esta edad y no deben hacer fallar una
    respuesta correcta (§1.1).

    Acertar da 10 puntos fijos. Fallar **no resta nada** (§2.1.5).
    """
    session, _ = _get_or_create_session(db, user.id, GameId.RIDDLE)

    riddle = db.scalar(select(Riddle).order_by(Riddle.id).limit(1))
    if riddle is None:
        raise ApiError("Ahora mismo no hay acertijo disponible.", status.HTTP_404_NOT_FOUND)

    is_correct = answers_match(payload.answer, riddle.accepted_answer)

    attempts_used = _attempt_count(db, session.id)

    db.add(
        RiddleAnswer(
            session_id=session.id,
            attempt_number=attempts_used + 1,
            given_answer=payload.answer.strip(),
            is_correct=is_correct,
        )
    )

    if is_correct:
        breakdown = score_riddle(is_correct=True)
        _upsert_score(db, user.id, GameId.RIDDLE, breakdown.points)
        session.status = SessionStatus.FINISHED
        session.finished_at = datetime.now(UTC)

    db.commit()

    return RiddleAnswerCheck(is_correct=is_correct, attempts_used=attempts_used + 1)

# --- Salir de la partida y reportar el acertijo (spec 006 · R-015, R-017) -----


@router.post(
    "/games/{game_id}/abandon",
    response_model=AbandonResponse,
    summary="Termina la partida en curso sin seguir jugando",
)
def abandon_session(
    game_id: GameId,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> AbandonResponse:
    """Marca la partida como abandonada (R-015, §2.1.6).

    Es el botón «Saltar partida», que la constitución pedía desde el principio y
    que no existía: la columna `abandoned` estaba en el modelo desde la spec 002
    sin que nada la escribiera.

    **Un solo paso, sin confirmación** (§4.2). Volver atrás no es una acción
    destructiva y nadie debería tener que confirmar que quiere dejar de jugar.

    Qué pasa en cada juego (§2.1.4, §2.1.6):

    · **Paraulógic y Acertijo:** solo se sale. El progreso se queda guardado y al
      volver está exactamente donde estaba (§2.1.7). En Paraulógic no hay ni
      derrota ni final, así que abandonar no significa nada más que cerrar.
    · **Wordle:** consume la única partida. El resultado se conserva y la pantalla
      lo enseña. Abandonar no es salir: es jugar mal a propósito, y por eso el
      aviso se dice **antes** de hacerlo.

    Abandonar dos veces no da error: la partida ya está abandonada, y eso es
    exactamente lo que se pidió.
    """
    session, _ = _get_or_create_session(db, user.id, game_id)

    gave_up = False

    if session.status == SessionStatus.ACTIVE:
        if game_id == GameId.WORDLE:
            # Wordle se juega una vez (§2.1.4). Terminar o abandonar es lo mismo
            # de cara a quien juega: no vuelve a haber palabra. Se conserva lo
            # hecho, que ya está guardado intento a intento.
            session.status = SessionStatus.FINISHED
            session.finished_at = datetime.now(UTC)
            gave_up = True

        session.abandoned = True
        db.commit()

    return AbandonResponse(game_id=game_id, gave_up=gave_up, message=GAME_LEFT)


@router.post(
    "/games/riddle/report",
    response_model=RiddleReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registra una respuesta rechazada que la persona cree correcta",
)
def report_riddle_answer(
    payload: RiddleReportRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> RiddleReportResponse:
    """Guarda lo que alguien escribió cuando cree que acertó (R-017, §2.1.4).

    **No concede puntos.** Ni uno. El campo `gave_points` de la respuesta dice
    `false` a propósito: la constitución dice que el reporte no da puntos y una
    respuesta que no lo afirmara dejaría esa decisión en manos del cliente, que
    es justo lo que §4.2 prohíbe (prometer lo que no ocurre).

    **Solo se acepta si la respuesta es incorrecta de verdad.** Si el servidor
    comprueba que es correcta, no hay nada que reportar y se dice con claridad.
    Aceptarlo sería guardar ruido sin motivo.

    Se guarda el texto escrito y qué acertijo era, nada más: ni `username`, ni IP
    (§6.5). El acertijo se resuelve por la partida de quien pregunta, no por lo
    que diga el cuerpo (§6.6).
    """
    riddle = db.scalar(select(Riddle).order_by(Riddle.id).limit(1))
    if riddle is None:
        raise ApiError(NOTHING_TO_SHOW, status.HTTP_404_NOT_FOUND)

    if answers_match(payload.given_answer, riddle.accepted_answer):
        raise ApiError(ANSWER_WAS_CORRECT, status.HTTP_400_BAD_REQUEST)

    session, _ = _get_or_create_session(db, user.id, GameId.RIDDLE)
    attempts_used = _attempt_count(db, session.id)

    report = RiddleAnswerReport(
        riddle_id=riddle.id,
        user_id=user.id,
        given_answer=payload.given_answer,
        attempt_number=attempts_used,
    )
    db.add(report)
    db.commit()

    return RiddleReportResponse(
        report_id=report.id,
        given_answer=report.given_answer,
        message=REPORT_SAVED,
    )


def _attempt_count(db: Session, session_id: int) -> int:
    """Cuántos intentos lleva esta partida.

    Vive al final porque lo usan dos endpoints. `submit_riddle_answer` hacía este
    mismo `select` con la misma forma; no se copia la expresión por si algún día
    cambia.
    """
    return (
        db.scalar(
            select(func.count())
            .select_from(RiddleAnswer)
            .where(RiddleAnswer.session_id == session_id)
        )
        or 0
    )