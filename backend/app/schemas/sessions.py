"""Esquemas de entrada y salida de las partidas (§2.1.7).

Ninguno de estos modelos acepta un campo `points` o `score` **de entrada**. Es
deliberado: la puntuación se calcula en el servidor y no se recibe (§6.6). Si
alguien quisiera enviarla, tendría que añadir el campo a propósito y la
decisión quedaría a la vista.

Los que sí devuelven `score` lo hacen como **resultado** del cálculo, no como algo
que la persona pueda fijar.
"""

from typing import Literal

from pydantic import BaseModel, Field

#: Los tres valores de la pista de Wordle (§2.1.4). Se repiten aquí y no se
#: importa el enum del servidor porque este es el contrato público: si mañana se
#: renombra el enum interno, la API no cambia.
LetterResult = Literal["correct", "present", "absent"]


class ParaulogicAttemptRequest(BaseModel):
    """La palabra que alguien escribe en Paraulógic.

    No lleva puntos, ni un indicador de si es correcta, ni nada con lo que se
    pueda falsear una puntuación. El servidor comprueba contra la base de datos.
    """

    word: str = Field(min_length=1, max_length=50)


class WordleAttemptRequest(BaseModel):
    """El intento de Wordle: cinco letras. Sin puntos."""

    guess: str = Field(min_length=5, max_length=5)


class RiddleAnswerCheckRequest(BaseModel):
    """La respuesta al acertijo. Texto libre y sin puntos."""

    answer: str = Field(min_length=1, max_length=200)


class AttemptResponse(BaseModel):
    """Un intento de Wordle con su resultado."""

    attempt_number: int
    guess: str
    feedback: list[LetterResult]
    solved: bool
    score: int


class ParaulogicAttemptResponse(BaseModel):
    """El resultado de escribir una palabra en Paraulógic.

    Cuando la palabra es correcta se devuelve cuál era, para que la interfaz
    pueda confirmarlo sin tener que adivinarlo.
    """

    is_correct: bool
    score: int
    correct_word: str | None = None
    found_words: int = 0


class SessionStateResponse(BaseModel):
    """El estado guardado de una partida, para poder retomarla (§2.1.7)."""

    game_id: str
    status: Literal["active", "finished", "abandoned"]

    # Paraulógic
    found_words: list[str] = Field(default_factory=list)
    pending_count: int = 0

    # Wordle
    attempts_used: int = 0
    max_attempts: int = 6
    attempts: list[AttemptResponse] = Field(default_factory=list)

    # Acertijo
    solved: bool = False

    score: int = 0