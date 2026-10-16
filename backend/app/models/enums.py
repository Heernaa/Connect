"""Identificadores de los juegos.

`GameId` es un identificador, no una restricción. Vive en Python para que el
código sea claro, pero **no** se traduce a un `CHECK` en la base de datos: un
cuarto juego tiene que poder añadirse sin migración (§2.1.1).
"""

from enum import StrEnum


class GameId(StrEnum):
    PARAULOGIC = "paraulogic"
    WORDLE = "wordle"
    RIDDLE = "riddle"


class SessionStatus(StrEnum):
    """Estados de una partida.

    Deliberadamente **no** hay `lost`: en Paraulógic no se puede perder (§2.1.4)
    y en Wordle y el acertijo terminar no es perder. Añadir un estado de derrota
    aquí sería inventar una derrota que el producto no tiene.
    """

    ACTIVE = "active"
    FINISHED = "finished"
    ABANDONED = "abandoned"


class LetterFeedback(StrEnum):
    """La pista de cada letra de Wordle (§2.1.4).

    Cada valor existe para poder mostrarse **por texto y por icono**, nunca solo
    por color (§4.1).
    """

    CORRECT = "correct"
    PRESENT = "present"
    ABSENT = "absent"


#: El único idioma del MVP. El modelo guarda `lang` para no bloquear la
#: extensión futura, pero aquí no hay nada más (§2.1.2).
DEFAULT_LANG = "es"