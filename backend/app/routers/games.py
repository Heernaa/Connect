"""API de contenido de los juegos (§2.1.2).

Todo el contenido de los juegos sale de aquí, y sale **sin las soluciones**. La
base de datos es la única fuente de verdad: en el cliente no hay ni una palabra
de juego escrita a mano.

Estos endpoints son de **contenido**: dicen qué se puede jugar y qué hay que
resolver, no registran partidas ni puntos. Eso es la spec 005.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db
from app.errors import ApiError
from app.models.content import (
    Game,
    ParaulogicHint,
    ParaulogicSet,
    ParaulogicWord,
    Riddle,
    WordleWord,
)
from app.models.enums import GameId, SessionStatus
from app.models.session import GameSession
from app.schemas.games import (
    GameSummary,
    HintResponse,
    ParaulogicContent,
    RiddleContent,
    WordleContent,
)

router = APIRouter(prefix="/games", tags=["games"])

#: Aviso que se devuelve cuando no hay partida que enseñar.
NOTHING_TO_SHOW = "No hay nada que enseñar todavía."


def _single_paraulogic_set(db: Session) -> ParaulogicSet:
    """Devuelve el único conjunto de letras del MVP (§2.1.3).

    En el MVP hay un set único. Si algún día hubiera varios, este endpoint
    seguiría devolviendo el activo y habría que decidir cómo se elige; no se
    asume aquí.
    """
    paraulogic_set = db.scalar(select(ParaulogicSet).limit(1))
    if paraulogic_set is None:
        raise ApiError(NOTHING_TO_SHOW, status.HTTP_404_NOT_FOUND)
    return paraulogic_set


@router.get(
    "",
    response_model=list[GameSummary],
    summary="Lista los juegos disponibles",
)
def list_games(db: Session = Depends(get_db)) -> list[GameSummary]:
    """Devuelve identificador, nombre y descripción de cada juego (R-001).

    Se puede ver **sin iniciar sesión** (modo espectador, §2.4). Y no lleva
    ninguna solución: ni la palabra de Wordle ni la respuesta del acertijo.
    """
    games = db.scalars(select(Game).order_by(Game.sort_order, Game.id)).all()

    return [
        GameSummary(game_id=game.game_id, name=game.name, description=game.description)
        for game in games
    ]


@router.get(
    "/paraulogic",
    response_model=ParaulogicContent,
    summary="Contenido de Paraulógic: las letras y cuánto falta",
)
def paraulogic_content(db: Session = Depends(get_db)) -> ParaulogicContent:
    """Devuelve el conjunto de letras y cuántas palabras quedan (R-002).

    **No** devuelve las soluciones, ni las palabras ya encontradas: eso último
    depende de la partida de cada persona y se sirve en la spec 005.

    Sin sesión devuelve el total de palabras, que es información pública del
    puzzle y no una solución.
    """
    paraulogic_set = _single_paraulogic_set(db)

    total_words = db.scalar(
        select(func.count())
        .select_from(ParaulogicWord)
        .where(ParaulogicWord.set_id == paraulogic_set.id)
    )

    return ParaulogicContent(letters=paraulogic_set.letters, pending_count=total_words or 0)


@router.get(
    "/paraulogic/hint",
    response_model=HintResponse,
    summary="Pide una pista de una palabra que aún no se ha encontrado",
)
def paraulogic_hint(db: Session = Depends(get_db)) -> HintResponse:
    """Devuelve **una** pista de una palabra pendiente (R-003).

    Se priorizan las palabras menos conocidas (`is_common = false`): son las
    literarias, y quien pide ayuda con una de esas es quien más la necesita
    (§1.1). Al elegir entre las menos comunes al azar, la pista no señala siempre
    a la misma palabra.

    **Pedir pistas no toca la puntuación** (§2.1.5). Aquí no se escribe nada: el
    único efecto de una pista es la ayuda.
    """
    paraulogic_set = _single_paraulogic_set(db)

    hint = db.scalar(
        select(ParaulogicHint)
        .join(ParaulogicWord, ParaulogicWord.id == ParaulogicHint.word_id)
        .where(ParaulogicHint.set_id == paraulogic_set.id)
        .order_by(
            # Las poco comunes primero; entre ellas, al azar.
            ParaulogicWord.is_common.asc(),
            func.random(),
        )
        .limit(1)
    )

    if hint is None:
        raise ApiError(NOTHING_TO_SHOW, status.HTTP_404_NOT_FOUND)

    word = db.get(ParaulogicWord, hint.word_id)

    return HintResponse(
        hint_text=hint.hint_text,
        word_length=len(word.word),
        is_common=word.is_common,
    )


@router.get(
    "/wordle",
    response_model=WordleContent,
    summary="La palabra de Wordle, si hay partida en marcha",
)
def wordle_content(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
) -> WordleContent:
    """Devuelve la palabra de Wordle **solo si hay partida en marcha** (R-004).

    Sin sesión, o si el jugador ya usó su única partida, **no** se devuelve la
    palabra: se devuelve `already_finished` y el jugador ve su resultado (§2.1.4).
    """
    if current_user is None:
        return WordleContent(word=None, already_finished=True)

    session = db.scalar(
        select(GameSession).where(
            GameSession.user_id == current_user.id,
            GameSession.game_id == GameId.WORDLE,
        )
    )

    if session is None or session.status != SessionStatus.ACTIVE:
        return WordleContent(word=None, already_finished=True)

    wordle_word = db.scalar(select(WordleWord).order_by(WordleWord.id).limit(1))
    if wordle_word is None:
        raise ApiError(NOTHING_TO_SHOW, status.HTTP_404_NOT_FOUND)

    return WordleContent(word=wordle_word.word, already_finished=False)


@router.get(
    "/riddle",
    response_model=RiddleContent,
    summary="El enunciado del acertijo",
)
def riddle_content(db: Session = Depends(get_db)) -> RiddleContent:
    """Devuelve solo el enunciado (R-005).

    `accepted_answer` **no** sale de aquí nunca: la comparación se hace en el
    servidor (§2.1.2).
    """
    riddle = db.scalar(select(Riddle).order_by(Riddle.id).limit(1))
    if riddle is None:
        raise ApiError(NOTHING_TO_SHOW, status.HTTP_404_NOT_FOUND)

    return RiddleContent(question=riddle.question)