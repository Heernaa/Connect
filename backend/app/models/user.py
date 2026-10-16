"""Modelo de usuario.

El usuario tiene **cinco** campos y ninguno más: identificador, nombre de
usuario, hash de la contraseña, alias anónimo y fecha de alta. No hay nombre
real, ni correo, ni teléfono, ni foto, ni edad (§6.5).
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


def normalize_username(username: str) -> str:
    """Pasa un nombre de usuario a la forma en la que se compara.

    Sin esta normalización, `Carmen` y `carmen` serían dos cuentas distintas y
    el mismo nombre podría aparecer varias veces (§6.2). Además se recortan los
    espacios de los extremos: dos tecleos con un espacio de más no deberían
    crear una cuenta distinta.
    """
    return username.strip().casefold()


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)

    # El nombre tal como lo escribió la persona. `username_normalized` es el que
    # lleva la restricción de unicidad, porque es el que se compara. La unicidad
    # ya crea su índice, así que no hace falta un `index=True` encima: sería un
    # segundo índice idéntico sobre la misma columna.
    username: Mapped[str] = mapped_column(String(50), nullable=False)
    username_normalized: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    # Nunca sale de aquí hacia el cliente. La exclusión es explícita en
    # `schemas/auth.py`, no por descuido (spec 003 · R-002).
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Alias anónimo, único e independiente del nombre de usuario (§2.2).
    alias: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )