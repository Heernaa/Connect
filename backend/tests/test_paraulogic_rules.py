"""Regla de formación de Paraulógic (R-003, R-006, R-007).

Función pura: se prueba sin base de datos, incluidos los casos límite.
"""

import pytest

from app.services.paraulogic_rules import InvalidWordError, letter_counts, validate_word

LETTERS = "AENRST"


def test_accepts_a_valid_word_and_returns_it_uppercase() -> None:
    assert validate_word("seran", LETTERS) == "SERAN"


def test_accepts_a_word_that_uses_every_letter_once() -> None:
    assert validate_word("ENTRAS", LETTERS) == "ENTRAS"


def test_ignores_surrounding_spaces_and_case() -> None:
    assert validate_word("  enTRas  ", LETTERS) == "ENTRAS"


def test_rejects_a_word_with_a_letter_outside_the_set() -> None:
    """V.7: una palabra con una letra ajena al conjunto se rechaza."""
    with pytest.raises(InvalidWordError, match="no está en el conjunto"):
        validate_word("PESADO", LETTERS)


def test_rejects_a_word_using_a_letter_more_often_than_the_set() -> None:
    """La regla es de multiplicidades, no solo de letras presentes.

    `SEN` se puede formar, pero `SENN` no: el conjunto tiene una sola N.
    """
    with pytest.raises(InvalidWordError, match="solo tiene 1"):
        validate_word("SENN", LETTERS)


def test_rejects_an_empty_word() -> None:
    """Caso límite: palabra vacía."""
    with pytest.raises(InvalidWordError, match="vacía"):
        validate_word("   ", LETTERS)


def test_rejects_an_empty_letter_set() -> None:
    """Caso límite: conjunto vacío."""
    with pytest.raises(InvalidWordError, match="conjunto de letras está vacío"):
        validate_word("SERAN", "")


def test_rejects_non_letters() -> None:
    with pytest.raises(InvalidWordError, match="solo puede tener letras"):
        validate_word("SEN-AR", LETTERS)


def test_error_messages_are_readable_plain_spanish() -> None:
    """§4.1: los errores van en lenguaje llano, sin códigos técnicos.

    El motivo se leería también en la interfaz si la validación llegara al
    cliente, así que no puede contener nombres de función ni de excepción.
    """
    with pytest.raises(InvalidWordError) as error:
        validate_word("PESADO", LETTERS)

    message = str(error.value)
    assert "Traceback" not in message
    assert "InvalidWordError" not in message
    assert "validate_word" not in message


def test_letter_counts_ignores_spaces() -> None:
    assert letter_counts("A E N R S T") == letter_counts(LETTERS)


def test_wordle_words_are_rejected_when_they_are_not_five_letters(seeded_db_session) -> None:
    """R-004: la base de datos rechaza una palabra que no sea de 5 letras.

    El `CHECK` está en PostgreSQL, no solo en Python: el dato protegido en la
    base de datos sigue protegido aunque alguien inserte saltándose la
    aplicación.
    """
    from sqlalchemy.exc import IntegrityError

    from app.models import WordleWord

    seeded_db_session.add(WordleWord(word="LUNASX", lang="es"))

    with pytest.raises(IntegrityError):
        seeded_db_session.commit()

    seeded_db_session.rollback()
