"""Generación del alias anónimo (§2.2).

Reglas que el(alias cumple:

- Es único.
- Se forma de un adjetivo y un animal, y **no depende del nombre de usuario**.
  Saber el nombre de usuario de alguien no revela su alias, ni al revés.
- No se elige: lo asigna el sistema en el registro.
"""

import secrets

from app.content.alias_words import ADJECTIVES, ANIMALS

#: Se reintenta esta cantidad de veces antes de rendirse. El objetivo es
#: encontrar un alias libre, no garantizarlo: hay 20 × 19 combinaciones, y para
#: el número de cuentas de un entorno local eso da margen de sobra.
MAX_ALIAS_ATTEMPTS = 10


def generate_alias() -> str:
    """Devuelve un alias nuevo.

    Usa `secrets` y no `random`: con `random` los aliases serían predecibles a
    partir de una semilla, lo que rompería la independencia del nombre de
    usuario.
    """
    adjective = secrets.choice(ADJECTIVES)
    animal = secrets.choice(ANIMALS)
    return f"{animal}{adjective}"


def is_valid_alias(alias: str) -> bool:
    """Indica si un alias tiene la forma esperada.

    No es una medida de seguridad: es una comprobación de que el dato es lo que
    la tabla dice ser, para no propagar basura.
    """
    return any(
        alias == f"{animal}{adjective}"
        for animal in ANIMALS
        for adjective in ADJECTIVES
    )