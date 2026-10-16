"""Regla de formación de las palabras de Paraulógic (§2.1.4, §2.1.8).

Una palabra es válida si usa **solo** letras del conjunto y **ninguna letra más
veces** de las que aparece en él. Es una función pura: recibe texto y devuelve un
motivo o `None`. No toca la base de datos, así que se puede probar sola con
casos límite.
"""

from collections import Counter


class InvalidWordError(ValueError):
    """La palabra no se puede formar con el conjunto de letras.

    El mensaje va dirigido a quien lee el error, en lenguaje llano y sin
    tecnicismos (§4.1). En el servidor normalmente lo vería alguien de
    desarrollo, pero el mismo texto acaba en la validación de la API.
    """


def letter_counts(letters: str) -> Counter[str]:
    """Cuenta cuántas veces aparece cada letra en el conjunto."""
    return Counter(letter for letter in letters.upper() if not letter.isspace())


def validate_word(word: str, letters: str) -> str:
    """Devuelve la palabra en mayúsculas si es válida.

    Lanza `InvalidWordError` con el motivo si no lo es. La validación vive en el
    servidor y no en el cliente: quien decide qué palabras existen es el servidor,
    nunca el navegador (§2.1.2).
    """
    normalized = word.strip().upper()

    if not normalized:
        raise InvalidWordError("La palabra está vacía.")

    if any(not letter.isalpha() for letter in normalized):
        raise InvalidWordError("La palabra solo puede tener letras.")

    available = letter_counts(letters)
    if not available:
        raise InvalidWordError("El conjunto de letras está vacío.")

    needed = Counter(normalized)

    for letter, count in sorted(needed.items()):
        if letter not in available:
            raise InvalidWordError(
                f"La palabra usa la letra «{letter}», que no está en el conjunto."
            )
        if count > available[letter]:
            raise InvalidWordError(
                f"La palabra usa la letra «{letter}» {count} veces y el conjunto "
                f"solo tiene {available[letter]}."
            )

    return normalized