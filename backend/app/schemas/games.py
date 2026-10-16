"""Esquemas de la API de contenido de los juegos.

Regla que atraviesa todos estos modelos: **aquí no hay ningún campo que sea la
solución**. Ni la palabra de Wordle, ni las palabras de Paraulógic, ni la
respuesta del acertijo. Un modelo que tuviera uno no se escribiría, que es
justamente la forma de que la regla se note si alguien la rompe (spec 004).
"""


from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.errors import REPORT_BLANK
from app.models.gameplay import MAX_REPORT_LENGTH


class GameSummary(BaseModel):
    """Un juego del catálogo. Identificador, nombre y descripción (R-001).

    `played` y `score` los añade la spec 006 · R-018. Sin sesión valen `False` y
    `0`: el estado de una partida es de la cuenta, no del juego, y sin cuenta no
    hay estado que enseñar. La lista se ve igual de todas formas (§2.4).
    """

    game_id: str
    name: str
    description: str

    #: Si esta persona tiene una partida en este juego, la haya empezado o no.
    played: bool = False

    #: Puntos acumulados. Lo calcula el servidor y nunca se recibe (§6.6).
    score: int = 0


class ParaulogicContent(BaseModel):
    """El contenido de Paraulógic: qué letras hay y cuánto falta (R-002).

    Solo lo público y lo pendiente. Las soluciones no salen aquí, y las palabras ya
    encontradas tampoco: se devuelven aparte, en las que ha encontrado el jugador,
    nunca mezcladas con las que faltan.
    """

    letters: str
    pending_count: int = Field(description="Palabras que quedan por encontrar.")


class HintResponse(BaseModel):
    """Una pista (R-003).

    `word_length` es solo el número de letras. El texto de la pista no contiene la
    palabra, y hay un test que lo comprueba sobre el contenido de la base de datos.
    """

    hint_text: str
    word_length: int
    is_common: bool = Field(
        description="Si la palabra es de las más conocidas. Las difíciles se priorizan."
    )


class WordleContent(BaseModel):
    """La palabra de Wordle y su estado (R-004)."""

    word: str | None = Field(
        default=None,
        description="La palabra, solo si la partida está en marcha.",
    )
    already_finished: bool = Field(
        description="Si el jugador ya usó su única partida. Entonces no hay palabra."
    )


class RiddleContent(BaseModel):
    """El enunciado del acertijo (R-005). Nunca la respuesta."""

    question: str


class RiddleAnswerCheck(BaseModel):
    """Lo que devuelve el servidor al comprobar una respuesta (R-006)."""

    is_correct: bool
    attempts_used: int


class HintAvailable(BaseModel):
    """Si queda alguna pista por pedir."""

    available: bool


class AbandonResponse(BaseModel):
    """Confirmación de que la partida se ha terminado (R-015).

    `gave_up` dice si la persona，创被视为 sigue en marcha o la ha terminado.
    No es un dato informativo: es lo que permite a la interfaz **no** pintar una
    partida que ya no existe. En Wordle, abandonar consume la única partida
    (§2.1.4), así que quien recibe `gave_up: true` tiene que dejar de enseñar el
    teclado aunque el estado local diga lo contrario.
    """

    game_id: str
    gave_up: bool
    message: str


class RiddleReportRequest(BaseModel):
    """Lo que una persona escribe cuando cree que su respuesta era correcta.

    Sin `riddle_id`: el servidor sabe qué acertijo es el que hay. Aceptarlo sería
    dejar que alguien reporte sobre un acertijo que no existe, o que no es el que
    está jugando (§2.1.2).
    """

    given_answer: Annotated[str, Field(max_length=MAX_REPORT_LENGTH)]

    @field_validator("given_answer")
    @classmethod
    def _validate_answer(cls, value: str) -> str:
        stripped = value.strip()

        if not stripped:
            raise ValueError(REPORT_BLANK)

        return stripped


class RiddleReportResponse(BaseModel):
    """Confirmación del reporte (R-017).

    Lleva `gave_points: false` **a propósito**, y es lo más importante del
    modelo. La constitución dice que el reporte no concede puntos (§2.1.4), y una
    respuesta que no lo dice dejaría a la interfaz libre de prometer lo que
    quiere. Aquí el servidor lo afirma, y la interfaz lo enseña.
    """

    report_id: int
    given_answer: str
    gave_points: bool = False
    message: str