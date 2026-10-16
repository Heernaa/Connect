"""Modelos de la base de datos.

Este `__init__` importa todos los modelos a propósito: Alembic recorre
`Base.metadata` para autodetectar el esquema, y un modelo que no se importa aquí
no aparece en las migraciones.
"""

from app.models.base import Base
from app.models.content import ParaulogicHint, ParaulogicSet, ParaulogicWord, Riddle, WordleWord
from app.models.session import (
    GameSession,
    ParaulogicFoundWord,
    RiddleAnswer,
    Score,
    WordleAttempt,
)
from app.models.user import User, normalize_username

__all__ = [
    "Base",
    "GameSession",
    "ParaulogicFoundWord",
    "ParaulogicHint",
    "ParaulogicSet",
    "ParaulogicWord",
    "Riddle",
    "RiddleAnswer",
    "Score",
    "User",
    "WordleAttempt",
    "WordleWord",
    "normalize_username",
]