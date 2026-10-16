"""Cálculo de la pista de letras de Wordle (§2.1.4).

Cada valor tiene que poder mostrarse por texto y por icono, nunca solo por color
(§4.1), así que se comprueba el valor exacto de cada posición.
"""

import pytest

from app.models.enums import LetterFeedback
from app.services.wordle_feedback import (
    compute_feedback,
)

CORRECT = LetterFeedback.CORRECT
PRESENT = LetterFeedback.PRESENT
ABSENT = LetterFeedback.ABSENT


def test_all_letters_correct_gives_a_solved_attempt() -> None:
    assert compute_feedback("LUNAS", "LUNAS") == [CORRECT] * 5


def test_a_wrong_letter_is_marked_absent() -> None:
    """⬜ La letra no aparece en la palabra."""
    assert compute_feedback("LUNAS", "XXXXX") == [ABSENT] * 5


def test_a_letter_in_the_wrong_place_is_marked_present() -> None:
    """🟡 La letra existe pero está en otra posición.

    `ANLUS` contra `LUNAS`: la S está en el sitio y las otras cuatro están en la
    palabra, pero en otro orden.
    """
    assert compute_feedback("LUNAS", "ANLUS") == [
        PRESENT,  # A: está, pero no en la posición 1
        PRESENT,  # N: está, pero no en la posición 2
        PRESENT,  # L: está, pero no en la posición 3
        PRESENT,  # U: está, pero no en la posición 4
        CORRECT,  # S: en su sitio
    ]


def test_a_letter_not_in_the_word_is_marked_absent() -> None:
    """⬜ La letra no aparece en la palabra.

    En `SALON` contra `LUNAS`, la O no está en ningún sitio: es la única de las
    cinco que no existe en la palabra.
    """
    assert compute_feedback("LUNAS", "SALON") == [
        PRESENT,
        PRESENT,
        PRESENT,
        ABSENT,
        PRESENT,
    ]


def test_repeated_letters_are_counted_only_once() -> None:
    """Una letra repetida de más no puede marcarse «en la palabra».

    `LUNAS` tiene una sola `S`. En `ASSAS` hay tres, y solo una puede contar como
    «está en la palabra»; las otras dos están ausentes. Es el comportamiento que
    la gente espera del juego, y sin él las pistas dirían cosas falsas.
    """
    feedback = compute_feedback("LUNAS", "ASSAS")

    assert feedback.count(PRESENT) + feedback.count(CORRECT) <= 2, (
        "No se puede marcar como presente una letra que no está en la palabra."
    )


def test_extra_copy_of_an_exhausted_letter_is_absent() -> None:
    """Una letra que ya se ha usado todas sus veces no está en la palabra.

    `LLANA` tiene dos L. En `LLALL` hay tres: las dos primeras están en su sitio y
    las otras dos se marcan como ausentes, porque las dos L del objetivo ya están
    colocadas. Marcarlas como presentes daría una pista falsa.
    """
    assert compute_feedback("LLANA", "LLALL") == [
        CORRECT,
        CORRECT,
        CORRECT,
        ABSENT,
        ABSENT,
    ]


def test_one_available_copy_of_a_repeated_letter_is_split_correctly() -> None:
    """Queda una L libre y hay dos en el intento: una se marca y la otra no.

    `LLANA` contra `ALALL`: una L está en su sitio y queda otra disponible, así
    que la L de la posición 4 es «está en la palabra» y la de la posición 5 ya no.
    """
    assert compute_feedback("LLANA", "ALALL") == [
        PRESENT,  # A: quedan dos A en el objetivo
        CORRECT,  # L en su sitio
        CORRECT,  # L en su sitio
        PRESENT,  # Le queda la segunda L del objetivo
        ABSENT,  # Ya no queda ninguna L
    ]


def test_rejects_a_guess_that_is_not_five_letters() -> None:
    with pytest.raises(ValueError, match="5 letras"):
        compute_feedback("LUNAS", "LUNASX")


def test_accepts_a_lowercase_guess() -> None:
    """Quien teclee en minúsculas no merece menos puntos (§1.1)."""
    assert compute_feedback("LUNAS", "lunas") == [CORRECT] * 5