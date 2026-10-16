"""Cálculo de la pista de cada letra de Wordle (§2.1.4).

Regla estándar, y la que la gente espera: una letra se marca como correcta si
está en su sitio; si no, se marca como presente si aparece en otro sitio de la
palabra; si no, como ausente.

Importante para nuestro usuario (§1.1): las letras repetidas se tratan con
cuidado. En `LUNAS`, si alguien escribiera `LUNES`, la segunda `L` no puede
contar como «está en la palabra» solo porque hay otra `L` más adelante. Se
consume una letra cada vez que se acierta, como en el juego original.
"""

from app.models.enums import LetterFeedback

WORD_LENGTH = 5
MAX_ATTEMPTS = 6


def compute_feedback(target_word: str, guess: str) -> list[LetterFeedback]:
    """Devuelve la pista de cada letra del intento.

    `target_word` y `guess` deben tener cinco letras. Devuelve una lista de cinco
    valores de `LetterFeedback`.
    """
    target = target_word.upper()
    attempted = guess.upper()

    if len(target) != WORD_LENGTH or len(attempted) != WORD_LENGTH:
        raise ValueError(f"La palabra y el intento deben tener {WORD_LENGTH} letras.")

    # Primero se marcan las letras en su sitio y se descuentan del objetivo.
    feedback: list[LetterFeedback | None] = [None] * WORD_LENGTH
    remaining: dict[str, int] = {}

    for index, letter in enumerate(target):
        if attempted[index] == letter:
            feedback[index] = LetterFeedback.CORRECT
        else:
            remaining[letter] = remaining.get(letter, 0) + 1

    # Después se resuelven las que no estaban en su sitio, de izquierda a derecha.
    for index, letter in enumerate(attempted):
        if feedback[index] is not None:
            continue

        available = remaining.get(letter, 0)
        if available > 0:
            feedback[index] = LetterFeedback.PRESENT
            remaining[letter] = available - 1
        else:
            feedback[index] = LetterFeedback.ABSENT

    return [item for item in feedback if item is not None]


def encode_feedback(feedback: list[LetterFeedback]) -> str:
    """Serializa la pista para guardarla en la base de datos.

    Se guarda como texto separado por comas. El `LetterFeedback` se convierte a su
    valor (`correct`, `present`, `absent`) porque al releer hay que poder
    distinguir un fallo de guardado de una pista válida.
    """
    return ",".join(
        {
            LetterFeedback.CORRECT: "correct",
            LetterFeedback.PRESENT: "present",
            LetterFeedback.ABSENT: "absent",
        }[item]
        for item in feedback
    )


def decode_feedback(stored: str) -> list[LetterFeedback]:
    """Deserializa la pista guardada."""
    return [LetterFeedback(value) for value in stored.split(",")]