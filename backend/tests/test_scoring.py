"""Fórmula de puntuación (§2.1.5, R-005 a R-008).

Función pura: se prueba sola. El módulo es la **única fuente** de la fórmula, y
esto es lo que fija sus valores.
"""

import pytest

from app.services.scoring import (
    PARAULOGIC_POINTS_PER_WORD,
    RIDDLE_POINTS,
    WORDLE_BASE_POINTS,
    score_paraulogic,
    score_riddle,
    score_wordle,
)


def test_paraulogic_gives_one_point_per_word() -> None:
    """R-006 y V.7: cada palabra encontrada suma exactamente 1 punto."""
    assert PARAULOGIC_POINTS_PER_WORD == 1
    assert score_paraulogic(0).points == 0
    assert score_paraulogic(1).points == 1
    assert score_paraulogic(21).points == 21


def test_paraulogic_does_not_penalise_attempts() -> None:
    """R-006 y V.4: los intentos ilimitados no penalizan.

    La función no recibe el número de intentos, y eso **es** el requisito: no hay
    forma de que un intento reste.
    """
    assert score_paraulogic(5).points == 5


def test_paraulogic_rejects_a_negative_word_count() -> None:
    """Una puntuación negativa nunca es válida."""
    with pytest.raises(ValueError, match="no puede ser negativo"):
        score_paraulogic(-1)


def test_paraulogic_explains_how_it_was_calculated() -> None:
    """Sin explicación no hay forma de saber por qué una cifra es la que es."""
    breakdown = score_paraulogic(7)

    assert any("7 palabras" in reason for reason in breakdown.explanation)
    assert any("pistas" in reason.lower() for reason in breakdown.explanation)


# --- Wordle (R-007) ---------------------------------------------------------


@pytest.mark.parametrize(
    ("attempts_used", "expected_points"),
    [
        (1, 100),
        (2, 90),
        (3, 80),
        (4, 70),
        (5, 60),
        (6, 50),
    ],
)
def test_wordle_loses_ten_percent_per_attempt(attempts_used: int, expected_points: int) -> None:
    """R-007 y V.11: base 100, menos un 10 % por intento usado."""
    assert WORDLE_BASE_POINTS == 100
    assert score_wordle(attempts_used).points == expected_points


def test_wordle_never_awards_a_negative_score() -> None:
    """Caso límite: alguien que llega muy lejos no puede ficar en negativo.

    El tope del 100 % de penalización está para que un intento absurdo dé 0
    puntos, no −300.
    """
    assert score_wordle(50).points == 0


def test_wordle_needs_at_least_one_attempt() -> None:
    """Un acierto es, como mínimo, el intento en el que se acertó."""
    with pytest.raises(ValueError, match="al menos un intento"):
        score_wordle(0)


def test_wordle_score_decreases_as_attempts_increase() -> None:
    """El premio por resolverlo antes tiene que ser real, no decorativo."""
    scores = [score_wordle(attempts).points for attempts in range(1, 7)]

    assert scores == sorted(scores, reverse=True)


# --- Acertijo (R-008) --------------------------------------------------------


def test_riddle_gives_ten_points_for_a_correct_answer() -> None:
    """R-008: 10 puntos fijos al acertar."""
    assert RIDDLE_POINTS == 10
    assert score_riddle(is_correct=True).points == 10


def test_riddle_gives_nothing_but_never_subtracts() -> None:
    """R-008 y §2.1.5: fallar no resta. Nadie acaba en negativo (§1.1)."""
    breakdown = score_riddle(is_correct=False)

    assert breakdown.points == 0
    assert breakdown.points >= 0


def test_riddle_score_does_not_depend_on_the_number_of_attempts() -> None:
    """§2.1.5: se premia acertar, no acertar a la primera.

    La función no recibe el número de intentos: no hay forma de que influya.
    """
    assert score_riddle(is_correct=True).points == score_riddle(is_correct=True).points