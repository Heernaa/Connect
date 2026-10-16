"""Chat y bloqueos (spec 007, §2.3, §6.8).

Dos tablas, y solo dos:

- `chat_messages`: los mensajes, con su autor por **alias** a través del usuario.
- `user_blocks`: quién ha bloqueado a quién.

**No hay ninguna columna para la IP ni para ninguna otra huella** (R-009). No es
un olvido: es la razón por la que el chat es aceptable sin moderación. El
modelo se lee entero en `tests/test_no_personal_data.py`, que falla si aparece
una columna de identidad.

Lo que **tampoco** hay, y es una decisión (§6.8): ninguna tabla de reporte,
ningún campo de estado de moderación, ninguna cola de denuncia. Sin
moderadores, guardar eso no sirve de nada: el reporte no tiene a quién llegar.
`tests/test_no_report.py` lo comprueba.
"""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

#: Longitud máxima de un mensaje (§0.1). Suficiente para escribir con calma y lo
#: bastante corto para acotar el abuso.
MAX_MESSAGE_LENGTH = 500


class MessageKind(StrEnum):
    """De quién es un mensaje.

    Los del sistema existen para que no se puedan suplantar (§6.4): si el
    servidor dice «ahora puedes escribirle otra vez», tiene que ser distinguible
    de lo que dice cualquier usuario, y eso no se consigue con un icono en el
    cliente, sino con un valor en la respuesta.
    """

    USER = "user"
    SYSTEM = "system"


class ChatMessage(Base):
    """Un mensaje del chat.

    `author_id` es **anulable**: los mensajes del sistema los escribe el servidor
    y no tienen autor. Cuando sí lo tiene, apunta a `users.id` con cascada: si se
    borra la cuenta, sus mensajes se van con ella, y no queda ningún texto suyo
    en la base de datos (§6.5, R-010).

    El cuerpo es `Text` y no `String(500)` a propósito: el límite se aplica en
    el esquema de entrada, que es donde se puede rechazar con un mensaje escrito
    para la persona. Un `VARCHAR(500)` en la base de datos truncaría en silencio,
    que es peor que un error.
    """

    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False, default=MessageKind.USER)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        # El índice que necesita el polling (R-003): se pregunta siempre «lo que
        # ha pasado desde tal momento», y este par es exactamente esa pregunta.
        Index("ix_chat_messages_created_id", "created_at", "id"),
    )


class UserBlock(Base):
    """Un bloqueo: `blocker_id` ha decidido no ver ni oír a `blocked_id`.

    **Una fila, una dirección.** El efecto es bidireccional en la práctica
    (R-006): el bloqueado no puede escribir al que le bloqueó, y además deja de
    ver sus mensajes. Eso no necesita dos filas, sino que las consultas tengan en
    cuenta las dos direcciones. Guardar las dos sería duplicar el mismo hecho y
    acabar con la tabla desincronizada.
    """

    __tablename__ = "user_blocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    blocker_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    blocked_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (UniqueConstraint("blocker_id", "blocked_id", name="uq_user_blocks_pair"),)