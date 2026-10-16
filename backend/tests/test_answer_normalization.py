"""Normalización de la respuesta del acertijo (R-006, V.10).

Función pura: se prueba sola, sin servidor ni base de datos. Que nadie tenga que
levantar la aplicación para comprobar que «el mapa» y «  El   Mapa.  » son la
misma respuesta.
"""

import pytest

from app.services.answer_normalization import answers_match, normalize_answer


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("el mapa", "el mapa"),
        ("El Mapa", "el mapa"),
        ("EL MAPA", "el mapa"),
        ("  el mapa  ", "el mapa"),
        ("el   mapa", "el mapa"),
        ("el mapa.", "el mapa"),
        ("¿El mapa?", "el mapa"),
        ("el-mapa", "el mapa"),
        ("el mapa\n", "el mapa"),
    ],
)
def test_normalization_removes_what_does_not_change_the_meaning(
    raw: str, expected: str
) -> None:
    assert normalize_answer(raw) == expected


@pytest.mark.parametrize(
    "accented",
    ["camión", "canción", "niño", "ratón", "pintor", "árbol", "posición", "canción"],
)
def test_accents_and_diacritics_are_removed(accented: str) -> None:
    """§1.1: confundir una tilde es uno de los errores más frecuentes a esta edad.

    `canción` y `cancion` tienen que ser la misma respuesta.
    """
    without_accents = accented.translate(
        str.maketrans("áéíóúüñÁÉÍÓÚÜÑ", "aeiouunAEIOUUN")
    )

    assert normalize_answer(accented) == normalize_answer(without_accents)


def test_empty_text_normalizes_to_empty_string() -> None:
    """Caso límite: una respuesta vacía."""
    assert normalize_answer("") == ""
    assert normalize_answer("   ") == ""


def test_only_punctuation_normalizes_to_empty_string() -> None:
    """Caso límite: quien responde solo con signos."""
    assert normalize_answer("¿¿¿...!!!") == ""


@pytest.mark.parametrize(
    ("given", "accepted"),
    [
        ("el mapa", "el mapa"),
        ("El Mapa", "el mapa"),
        ("  EL MAPA.  ", "el mapa"),
        ("el-mapa", "el mapa"),
    ],
)
def test_answers_match_ignores_case_accents_and_extra_spaces(
    given: str, accepted: str
) -> None:
    assert answers_match(given, accepted)


@pytest.mark.parametrize(
    ("given", "accepted"),
    [
        ("el mapa", "la tabla"),
        ("el mapa", "un mapa"),
        ("la.brújula", "el mapa"),
    ],
)
def test_different_answers_do_not_match(given: str, accepted: str) -> None:
    assert not answers_match(given, accepted)


def test_normalization_folds_the_tilde_of_enye_like_any_other_accent() -> None:
    """La eñe se normaliza igual que cualquier otra tilde.

    `cañon` y `cañón` son la misma respuesta. Es el mismo criterio que se aplica a
    `cancion` y `canción`, y es lo que evita que una tilde sola haga que una
    respuesta correcta se rechace (§1.1).
    """
    assert normalize_answer("cañon") == normalize_answer("cañón")
    assert normalize_answer("cañón") == "canon"


def test_normalization_does_not_translate_or_reorder() -> None:
    """La normalización arregla la forma, nunca el significado."""
    assert normalize_answer("el mapa la tierra") != normalize_answer("la tierra el mapa")
    assert normalize_answer("el mapa") != normalize_answer("la brújula")