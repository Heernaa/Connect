"""Modelos de autenticación: sesiones activas e intentos de acceso fallidos."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AuthSession(Base):
    """Una sesión iniciada.

    Se guarda el **hash** del token, no el token. Quien lea esta tabla no puede
    suplantar a nadie sin tener también el token del navegador (§6.1).
    """

    __tablename__ = "auth_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(nullable=False, default=False)

    def is_usable(self, now: datetime) -> bool:
        """Indica si la sesión sirve todavía."""
        return not self.revoked and self.expires_at > now


class LoginAttempt(Base):
    """Un intento de inicio de sesión **fallido**.

    Solo se guardan los fallidos: un intento correcto demuestra que la contraseña
    era buena y no aporta nada para frenar la fuerza bruta.

    No se guarda la IP ni ninguna otra huella. Serían datos personales (§6.5), y
    además obligarían a mantener un dato que el proyecto no necesita.
    """

    __tablename__ = "login_attempts"

    id: Mapped[int] = mapped_column(primary_key=True)
    username_normalized: Mapped[str] = mapped_column(String(50), nullable=False)
    attempted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_login_attempts_username_time", "username_normalized", "attempted_at"),
    )