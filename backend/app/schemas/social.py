"""Esquemas de la clasificación y el chat (spec 007, §2.3, §2.4, §6.5).

Dos reglas que este archivo existe para hacer **imposibles de romper por
descuido**:

1. **Ningún esquema de clasificación declara `username`** (R-001). Es el campo
   que la constitución prohíbe exponer (§6.5). Si no está en el modelo, no sale;
   no depende de que alguien recuerde quitarlo. La misma estrategia que
   `UserResponse` con `password_hash` (spec 003 · R-002), y por el mismo motivo.
2. **Ningún esquema de chat acepta un autor.** El alias lo pone el servidor a
   partir de la sesión. Si el cliente pudiera mandar el alias, podría escribir
   como otro (§6.6).
"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.chat import MAX_MESSAGE_LENGTH
from app.services.chat_text import (
    MESSAGE_EMPTY,
    MESSAGE_HAS_LINK,
    MESSAGE_TOO_LONG,
    contains_image,
    contains_link,
)

#: Tope de filas por página en la clasificación. El cliente no puede pedir
#: «todo»: la clasificación puede tener miles de filas y mandarlas todas sería
#: volcar la tabla entera en el navegador de alguien con un móvil (R-002).
MAX_PAGE_SIZE = 100

DEFAULT_PAGE_SIZE = 25


class LeaderboardEntry(BaseModel):
    """Una fila de la clasificación.

    `game_id` es `None` en la clasificación **global** y lleva el identificador
    en la clasificación **por juego**. Un único modelo para las dos vistas: si
    fueran dos modelos, cada campo podría divergir sin que nada lo notase.
    """

    alias: str
    points: int
    game_id: str | None = None


class LeaderboardResponse(BaseModel):
    """La clasificación, con lo mínimo para paginar sin inventar nada.

    `has_more` viene del servidor en lugar de calcularlo en el cliente comparando
    el número de filas con el tamaño de página: es una comparación que se
    equivoca justo en el borde, cuando llega exactamente una página completa.
    """

    entries: list[LeaderboardEntry]
    total: int
    has_more: bool


class ChatMessageRequest(BaseModel):
    """Lo que llega al escribir un mensaje.

    Sin autor, sin marca de tiempo y sin nada que se pueda usar para fingir ser
    otro (§6.6). Los validadores escriben los mensajes en español llano en vez
    de dejar que Pydantic genere los suyos, que son en inglés y técnicos (§4.1).
    """

    body: str

    @field_validator("body")
    @classmethod
    def _validate_body(cls, value: str) -> str:
        text = value.strip()

        if not text:
            raise ValueError(MESSAGE_EMPTY)

        if len(text) > MAX_MESSAGE_LENGTH:
            raise ValueError(MESSAGE_TOO_LONG)

        # El orden importa poco, pero se comprueba el enlace primero: es lo que
        # va a aparecer en un intento de phishing, y el mensaje que lo explica
        # debe llegar en el caso de verdad.
        if contains_link(text):
            raise ValueError(MESSAGE_HAS_LINK)

        if contains_image(text):
            raise ValueError(MESSAGE_HAS_LINK)

        return text


class ChatMessageResponse(BaseModel):
    """Un mensaje, ya con su alias resuelto.

    `author_id` **sí se envía**, y parece una excepción a «solo alias». No lo es:
    para que el botón de bloquear funcione (R-006), el cliente tiene que saber a
    quién va a bloquear, y el alias no sirve —no es único de forma garantizada—
    ni debería usarse. Es un identificador interno, no un dato personal: no dice
    nada de la persona que no diga ya su alias, y no se muestra en pantalla.

    `is_mine` lo pone el servidor comparando con la sesión. Es lo que permite que
    la interfaz apunte el botón de bloquear solo a los mensajes ajenos sin
    comparar alias en el cliente, que sería confiar en lo que se ha pintado.
    """

    message_id: int
    author_id: int | None
    alias: str | None
    body: str
    kind: str
    created_at: datetime
    is_mine: bool


class ChatMessagesResponse(BaseModel):
    """Los mensajes nuevos desde la última consulta."""

    messages: list[ChatMessageResponse]
    #: El momento de la última consulta. El cliente lo guarda y lo envía en la
    #: siguiente, que es lo que hace que el polling traiga solo lo nuevo (R-003).
    poll_from: datetime


class BlockRequest(BaseModel):
    """Cuerpo vacío del bloqueo.

    Existe para dejar escrito en la firma de la ruta que bloquear no necesita
    datos: se bloquea a quien está en el identificador, no a quien diga el
    cuerpo. Un `POST` sin cuerpo también valdría, pero un modelo vacío deja la
    intención a la vista.
    """


class DeleteAccountResponse(BaseModel):
    """Confirmación del borrado de la cuenta (R-010)."""

    message: str


class MessageLimits(BaseModel):
    """Límites que el cliente necesita conocer para no fallar solo.

    Se devuelven en un endpoint aparte en lugar de repetidos en cada respuesta:
    son valores del servidor (§2.4) y no deben estar escritos a mano en el
    cliente, que es donde se equivocaría sin que nadie se entere.
    """

    max_length: int = Field(default=MAX_MESSAGE_LENGTH)