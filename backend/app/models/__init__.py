"""Modelos de la base de datos.

Este `__init__` importa todos los modelos a propósito: Alembic recorre
`Base.metadata` para autodetectar el esquema, y un modelo que no se importa aquí
no aparece en las migraciones.
"""

from app.models.auth import AuthSession, LoginAttempt
from app.models.base import Base
from app.models.chat import MAX_MESSAGE_LENGTH, ChatMessage, MessageKind, UserBlock
from app.models.content import (
    Game,
    ParaulogicHint,
    ParaulogicSet,
    ParaulogicWord,
    Riddle,
    WordleWord,
)
from app.models.gameplay import MAX_REPORT_LENGTH, RiddleAnswerReport
from app.models.session import (
    GameSession,
    ParaulogicFoundWord,
    RiddleAnswer,
    Score,
    WordleAttempt,
)
from app.models.user import User, normalize_username

__all__ = [
    "MAX_MESSAGE_LENGTH",
    "MAX_REPORT_LENGTH",
    "AuthSession",
    "Base",
    "ChatMessage",
    "Game",
    "GameSession",
    "LoginAttempt",
    "MessageKind",
    "ParaulogicFoundWord",
    "ParaulogicHint",
    "ParaulogicSet",
    "ParaulogicWord",
    "Riddle",
    "RiddleAnswer",
    "RiddleAnswerReport",
    "Score",
    "User",
    "UserBlock",
    "WordleAttempt",
    "WordleWord",
    "normalize_username",
]