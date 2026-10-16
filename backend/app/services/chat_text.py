"""Qué se admite en un mensaje de chat (R-004, §6.8).

El chat **no admite enlaces, imágenes ni formato**. Solo texto plano.

Por qué es una restricción y no un filtro: el phishing es el vector de ataque
más probable contra este perfil de usuario (§6.8). Una cuenta mayor que ve un
enlace en un chat de personas que ya conoce tiene motivos para pulsarlo. Quitar
los enlaces **de las opciones** del producto reduce esa superficie sin confiar en
que la persona va aiaguar.

**Aquí no se borra ni se oculta nada: se rechaza.** El mensaje entero, con un
motivo escrito para quien lo va a leer. Si se quitara solo el enlace, quien
escribiera un mensaje con un enlace dentro sabría que algo se filtró, y el
mensaje se seguiría mandando.

Que el rechazo ocurra en el servidor no es opcional: si solo lo hiciera el
cliente, quien llamara a la API directamente podría escribir lo que quisiera
(§2.5, la frontera crítica).
"""

import re

#: Motivos de rechazo. Se comparan en el esquema de entrada y salen hacia la
#: persona: cada uno dice qué pasó y qué hacer (R-009).
MESSAGE_HAS_LINK = (
    "El chat no admite enlaces. Escríbelo con palabras: no pongas ninguna "
    "dirección de internet."
)
MESSAGE_TOO_LONG = (
    "El mensaje es demasiado largo. Escribe un mensaje más corto: caben 500 "
    "letras."
)
MESSAGE_EMPTY = "Escribe algo antes de enviar el mensaje."

#: Patrones que delatan un enlace.
#:
#: No se intenta ser exhaustivo con todas las formas de escribir una URL: se
#: cubren las que se usan de verdad para estafar. Una lista exhaustiva tendría
#: que incluir todas las variantes de acortadores que existen y no se mantienen.
#:
#: · `https?://` y `ftp://`: el prefijo explícito, con o sin `www`.
#: · `www.`: la forma sin prefijo, que también es un enlace cuando se pulsa.
#: · Dominio terminado enextension habitual preceded de algo: cubre
#: · `banco.com`, `banco.es`, `.net`, `.org` y compañía, que es como se escriben
#:   los enlaces cuando se intenta disimular.
#:
#: No se filtra el símbolo `@`: un alias puede contenerlo y no sería un enlace, y
#: un falso positivo dejaría a alguien sin poder escribir su propio alias.
_URL_PATTERNS = (
    re.compile(r"\b(?:https?|ftp)://\S+", re.IGNORECASE),
    re.compile(r"\bwww\.\S+", re.IGNORECASE),
    re.compile(r"\b\S+\.(?:com|net|org|es|eu|info|biz|mobi|xyz|ru|cn)\b", re.IGNORECASE),
)

#: Marcadores de imagen o medio externo: `[img]`, `![]()`, `<img ...>`, `data:`.
#:
#: Un chat que no admite imágenes tiene que rechazarlas, no limitarlas a mostrar
#: un texto alternativo. Y `<img src=...>` es además una forma de meter HTML,
#: que aquí no se permite.
_IMAGE_PATTERNS = (
    re.compile(r"!\[[^\]]*\]\([^)]*\)"),
    re.compile(r"<img\b[^>]*>", re.IGNORECASE),
    re.compile(r"\bdata:image/", re.IGNORECASE),
)


def contains_link(text: str) -> bool:
    """Si el texto parece llevar un enlace.

    No devuelve el enlace encontrado: no hace falta para decidir, y buscarlo
    entero añadiría superficie de error.
    """
    return any(pattern.search(text) for pattern in _URL_PATTERNS)


def contains_image(text: str) -> bool:
    """Si el texto parece llevar una imagen."""
    return any(pattern.search(text) for pattern in _IMAGE_PATTERNS)


def is_plain_text(text: str) -> bool:
    """Si el texto es admisible: sin enlaces y sin imágenes.

    Es la función que decide. Los dos «contains» se llaman por separado en el
    esquema para poder decir **qué** ha pasado, pero la decisión de fondo es
    esta, y tenerla en un solo sitio evita que las dos reglas diverjan.
    """
    return not contains_link(text) and not contains_image(text)