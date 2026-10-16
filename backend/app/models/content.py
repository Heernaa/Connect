"""Contenido de los tres juegos.

Todo el contenido vive aquí y se sirve por la API (§2.1.2). En el cliente no
hay ni una palabra de juego escrita a mano.

Cada tabla lleva `lang` para no bloquear la extensión futura, pero el valor es
siempre `es` (§2.1.2): en el MVP no hay multiidioma.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ParaulogicSet(Base):
    """Un conjunto de letras del que se forman varias palabras.

    `letters` es su clave natural: sin ella, cargar el seed dos veces crearía
    conjuntos duplicados y cada palabra aparecería dos veces. El script de
    contenido es idempotente gracias a esta restricción (§2.1.3, spec 002 ·
    R-009).
    """

    __tablename__ = "paraulogic_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="es")
    letters: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class ParaulogicWord(Base):
    """Una palabra que se puede formar con las letras del conjunto.

    `is_common = False` marca las palabras más literarias. El botón de pistas las
    prioriza para que pedir ayuda no suponga vergüenza (§1.1, §2.1.8).
    """

    __tablename__ = "paraulogic_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(
        ForeignKey("paraulogic_sets.id", ondelete="CASCADE"), nullable=False
    )
    word: Mapped[str] = mapped_column(String(50), nullable=False)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    is_common: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    __table_args__ = (UniqueConstraint("set_id", "word"),)


class ParaulogicHint(Base):
    """Ayuda del botón de pistas. No restan puntos (§2.1.5)."""

    __tablename__ = "paraulogic_hints"

    id: Mapped[int] = mapped_column(primary_key=True)
    set_id: Mapped[int] = mapped_column(
        ForeignKey("paraulogic_sets.id", ondelete="CASCADE"), nullable=False
    )
    word_id: Mapped[int] = mapped_column(
        ForeignKey("paraulogic_words.id", ondelete="CASCADE"), nullable=False
    )
    hint_text: Mapped[str] = mapped_column(Text, nullable=False)
    hint_order: Mapped[int] = mapped_column(SmallInteger, nullable=False, default=1)

    __table_args__ = (UniqueConstraint("set_id", "word_id", "hint_order"),)


class WordleWord(Base):
    """La palabra objetivo de Wordle: exactamente 5 letras (§2.1.4).

    Se comprueba con un `CHECK` de PostgreSQL y no solo en Python: la regla
    protege el dato, y un dato protegido en la base de datos sigue protegido si
    alguien inserta datos saltándose la aplicación.
    """

    __tablename__ = "wordle_words"

    id: Mapped[int] = mapped_column(primary_key=True)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="es")
    word: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("lang", "word"),
        CheckConstraint("char_length(word) = 5", name="word_length_is_five"),
        CheckConstraint("word = upper(word)", name="word_is_uppercase"),
    )


class Riddle(Base):
    """Un acertijo con una única respuesta correcta (§2.1.4).

    `accepted_answer` nunca sale hacia el cliente. Lo decide el servidor.
    """

    __tablename__ = "riddles"

    id: Mapped[int] = mapped_column(primary_key=True)
    lang: Mapped[str] = mapped_column(String(5), nullable=False, default="es")
    question: Mapped[str] = mapped_column(Text, nullable=False)
    accepted_answer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )