"""Qué texto admite el chat (R-004, §6.8).

Tests **unitarios y sin base de datos**: la comprobación de enlaces es una
función pura y tiene que poder probarse sola, sin levantar nada.

Cada caso lleva su motivo. Un filtro sin ejemplos de lo que tiene que dejar
pasar acaba bloqueando mensajes normales, y eso, en un chat sin moderación, es
la forma más rápida de que la gente lo deje de usar.
"""

import pytest

from app.services.chat_text import contains_image, contains_link, is_plain_text

pytestmark = pytest.mark.unit


# --- Lo que tiene que rechazarse (V.7) ---------------------------------------


@pytest.mark.parametrize(
    "texto",
    [
        "https://banco-falso.com/acceso",
        "http://banco-falso.com",
        "HTTPS://BANCO.COM",
        "www.banco-falso.com",
        "ftp://servidor/x",
        "banco.com",
        "escribe a banco.es",
        "pincha en http://bit.ly/3xYz",
        "correo@dominio.com",
    ],
)
def test_a_link_is_detected(texto: str) -> None:
    """R-004: un enlace se detecta venga como venga.

    `HTTPS://BANCO.COM` está en la lista a propósito: las estafas escriben a
    mayúsculas para pasar filtros que solo miran minúsculas.
    """
    assert contains_link(texto) is True


@pytest.mark.parametrize(
    "texto",
    [
        "![foto](https://e.com/a.png)",
        "<img src=x>",
        "<IMG SRC='x'>",
        "data:image/png;base64,AAAA",
    ],
)
def test_an_image_is_detected(texto: str) -> None:
    """R-004: las imágenes también se rechazan, no se muestran como texto."""
    assert contains_image(texto) is True


# --- Lo que tiene que dejarse pasar ------------------------------------------


@pytest.mark.parametrize(
    "texto",
    [
        "Buenos días a todos",
        "¿Alguien ha encontrado la palabra de hoy?",
        "Tengo 3 gatos y 2 hijos: la vida está bien",
        "Mañana voy a Madrid en tren",
        "Mi correo es ana en punto gmail, sin punto",
        "¿Sabes si el Acertijo tiene respuesta corta?",
        "jajaja",
        "Buenos días. ¿Qué tal todo?",
        "E=mc2 no se parece en nada",
        "2+2=4, y el que diga otra cosa se equivoca",
    ],
)
def test_ordinary_messages_are_allowed(texto: str) -> None:
    """R-004: un filtro que bloquea frases normales hace que la gente no escriba.

    El caso `2+2=4` importa: lleva un punto y una letra detrás, que es lo que
    hace que un filtro perezoso confuse con una dirección web. Si este caso
    fallara, el filtro tendría que relajarse y entraría lo que pretende impedir.
    """
    assert is_plain_text(texto) is True


def test_an_empty_text_has_no_link() -> None:
    """Un texto vacío no es un enlace ni una imagen.

    No se filtra aquí si está vacío: eso es otra comprobación, la del mensaje en
    blanco, que dice una cosa distinta a quien lo ve.
    """
    assert is_plain_text("") is True


# --- Que la decisión esté en un solo sitio ------------------------------------


def test_the_two_checks_agree_with_the_decision() -> None:
    """R-004: `is_plain_text` es la suma de las dos, sin una tercera regla.

    Si `is_plain_text` tuviera su propia forma de decidir, podría diferir de los
    dos `contains` que usa el esquema para decir **qué** ha pasado. Entonces el
    mensaje de error podría decir «no se admiten enlaces» cuando lo que se
    rechazó fue una imagen, que es justo la clase de error que hace que alguien
    pida ayuda sin saber por qué.
    """
    casos = ["texto normal", "https://e.com", "banco.es", "www.e.com", "![a](b)", "<img src=x>"]

    for caso in casos:
        assert is_plain_text(caso) is not (contains_link(caso) or contains_image(caso))