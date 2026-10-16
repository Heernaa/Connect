"""Partidas, progreso y puntuación.

Los tres juegos comparten un único modelo de partida, aislado por `game_id`
(§2.1.1). Añadir un cuarto juego **no puede obligar** a cambiar estas tablas: por
eso `game_id` es texto sin restricción `CHECK` que lo limite a los juegos
actuales, y el progreso específico de cada juego va en su propia tabla en vez de
en columnas que habría que ampliar.
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class GameSession(Base):
    """Una partida de un jugador en un juego.

    Estados posibles: `active`, `finished`, `abandoned`.

    **No existe un estado de derrota** y no se añade: en Paraulógic no se puede
    perder (§2.1.4) y en los otros dos juegos acabarse no es perder. Un estado
    `lost` en esta tabla sería un camino a una derrota que el producto no tiene.
    """

    __tablename__ = "game_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    abandoned: Mapped[bool] = mapped_column(nullable=False, default=False)

    __table_args__ = (UniqueConstraint("user_id", "game_id", name="uq_game_sessions_user_game"),)


class ParaulogicFoundWord(Base):
    """Palabra encontrada por el jugador.

    Es un registro por palabra, no un contador: el servidor necesita saber
    *qué* encontró para poder restaurarlo al volver (§2.1.7) y para validar la
    puntuación sin fiarse del cliente (§6.6).
    """

    __tablename__ = "paraulogic_found_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False
    )
    word_id: Mapped[int] = mapped_column(
        ForeignKey("paraulogic_words.id", ondelete="CASCADE"), nullable=False
    )
    found_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("session_id", "word_id"),)


class WordleAttempt(Base):
    """Un intento de Wordle, con la pista de cada letra que devolvió el servidor.

    Guardar el resultado junto al intento permite restaurar la partida tal cual
    estaba (§2.1.7) y recalcular la puntuación sin confiar en nada del cliente.
    """

    __tablename__ = "wordle_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    guess: Mapped[str] = mapped_column(String(5), nullable=False)
    # Lista de tres letras por intento: 'correct' | 'present' | 'absent'.
    # Es el resultado ya calculado por el servidor; el cliente no lo decide.
    feedback: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("session_id", "attempt_number"),)


class RiddleAnswer(Base):
    """Una respuesta al acertijo. Guardar los intentos permite restaurarlos y
    contar cuántos hizo el jugador, aunque no influyan en la puntuación (§2.1.5).
    """

    __tablename__ = "riddle_answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), nullable=False
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    given_answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("session_id", "attempt_number"),)


class Score(Base):
    """Puntuación acumulada por jugador y juego.

    Una fila por (`user_id`, `game_id`): se actualiza al resolver, no al cerrar
    sesión (§2.1.7). **La puntuación total no se guarda**: se consulta sumando
    las filas, para que nunca pueda desincronizarse de la puntuación por juego.

    El valor lo calcula **siempre** el servidor (§6.6).
    """

    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    game_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (UniqueConstraint("user_id", "game_id"),)