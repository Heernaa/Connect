"""Esquemas de la API de contenido de los juegos.

Regla que atraviesa todos estos modelos: **aquí no hay ningún campo que sea la
solución**. Ni la palabra de Wordle, ni las palabras de Paraulógic, ni la
respuesta del acertijo. Un modelo que tuviera uno no se escribiría, que es
justamente la forma de que la regla se note si alguien la rompe (spec 004).
"""


from pydantic import BaseModel, Field


class GameSummary(BaseModel):
    """Un juego del catálogo. Identificador, nombre y descripción (R-001)."""

    game_id: str
    name: str
    description: str


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