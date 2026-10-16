"""Reportes de respuestas de acertijo que el sistema rechazó (spec 006 · R-017).

Una tabla, y una sola cosa en ella: qué escribió una persona cuando cree que su
respuesta **era correcta** y el servidor se la rechazó.

Por qué existe (§2.1.4). El acertijo se compara normalizando mayúsculas,
tildes, puntuación y espacios. Esa tolerancia hace el juego usable a esta edad,
pero no lo hace perfecto: siempre habrá una respuesta correcta que no se
reconoce, un plural que no estaba contemplado o una palabra con dos maneras
escritas. Quien acertó y ve «no es correcto» se queda con la impresión de que
la plataforma está rota, y con razón: para él lo está.

**Lo que este reporte NO hace**, y es deliberado:

- **No concede puntos** (§2.1.4). El campo `score` de `scores` no se toca. Dar
  puntos por reportar sería在于 un doorway de puntos libres.
- **No hay moderación ni revisor** (§6.8). La respuesta se guarda y no la lee
  nadie. Igual que el chat sin moderación: es una deuda registrada en §11, no un
  olvido. La diferencia es que aquí el reporte es el único camino que tiene
  quien acertó, y quitarlo le deja sin salida.
- **No guarda el `username` ni la IP** (§6.5). Solo el texto escrito y qué
  acertijo era. El texto ya lo escribió la persona; guardarlo no añade
  información que no tuviera.

El campo `riddle_id` y no el enunciado: el enunciado ya está en `riddles` y
duplicarlo haría que un cambio futuro dejara reportes apuntando a un texto que
ya no existe.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

#: Tope de longitud de lo que alguien escribe en el reporte. Suficiente para
#: escribir «la respuesta era CIELO, con mayúscula» y poco más.
#:
#: No es por moderación —aquí no hay moderación— sino por no dejar que un campo
#: de texto libre reciba un párrafo sin límite en una tabla que nadie va a leer
#: (R-009).
MAX_REPORT_LENGTH = 500


class RiddleAnswerReport(Base):
    """Una respuesta rechazada que alguien cree correcta.

    No tiene estado: no hay «pendiente», «revisado» ni «descartado». Guardar
    esos campos daría la impresión de que hay un proceso detrás, y no lo hay
    (§6.8). Es un registro, no una cola de trabajo.
    """

    __tablename__ = "riddle_answer_reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    riddle_id: Mapped[int] = mapped_column(
        ForeignKey("riddles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    given_answer: Mapped[str] = mapped_column(Text, nullable=False)

    #: El usuario que reportó. Con cascada: si borra la cuenta, sus reportes se
    #: van con ella (R-010). Guardar el identificador y no el nombre de usuario
    #: es lo mismo que se hizo en el chat (§6.5).
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    #: El número de intento que llevaba cuando lo escribió. Permite saber si
    #: llevaba varios fallando —lo normal— o si acertó a la primera y le
    #: rechazaron la respuesta.
    attempt_number: Mapped[int] = mapped_column(nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        Index("ix_riddle_answer_reports_riddle_created", "riddle_id", "created_at"),
    )