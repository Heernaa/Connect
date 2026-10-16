"""Normalización y comparación de respuestas del acertijo (R-006).

La comparación se hace **en el servidor**, contra el valor guardado en la base de
datos (§2.1.2, §2.1.4). El cliente nunca decide si una respuesta es correcta.

Función pura a propósito: se prueba sola, con casos límite, sin base de datos ni
servidor. Que nadie tenga que levantar la aplicación para comprobar que "el mapa"
y "  El   Mapa " son la misma respuesta.
"""

import unicodedata

#: Caracteres que se eliminan antes de comparar. La puntuación casi nunca
#: significa nada en la respuesta a un acertijo: una frase corta sin comas ni
#: puntos se responde igual.
IGNORED_CHARACTERS = ".,;:!?¡¿\"'()[]{}<>-_*/\\|…"


def normalize_answer(text: str) -> str:
    """Prepara un texto para compararlo con otro.

    Pasos, en este orden:

    1. Minúsculas, sin distinguir mayúsculas de minúsculas.
    2. Sin tildes ni diéresis: `camión` y `camion` son la misma respuesta.
    3. Sin puntuación.
    4. Espacios sobrantes eliminados y seguidos reducidos a uno.

    No se quitan los acentos de otra manera ni se traducen palabras: solo se
    normaliza la forma, nunca el significado.
    """
    if not text:
        return ""

    # `NFKD` separa la letra de su tilde, y así se puede quitar la marca sin
    # romper el resto de la palabra.
    decomposed = unicodedata.normalize("NFKD", text.casefold())

    without_marks = "".join(
        character
        for character in decomposed
        if not unicodedata.combining(character)
    )

    cleaned = "".join(
        " " if character in IGNORED_CHARACTERS else character for character in without_marks
    )

    # `split()` sin argumento parte por cualquier espacio y descarta los vacíos, así
    # que devuelve palabras ya separadas: los espacios sobrantes del principio, del
    # final y del medio desaparecen de golpe, y `el   mapa` queda igual que
    # `el mapa`.
    return " ".join(cleaned.split())


def answers_match(given: str, accepted: str) -> bool:
    """Indica si la respuesta dada es la esperada.

    Se comparan ya normalizadas las dos. La comparación exacta, sin más, haría
    fallar por una tilde o un espacio de más, que son exactamente los errores más
    frecuentes a esta edad (§1.1).
    """
    return normalize_answer(given) == normalize_answer(accepted)