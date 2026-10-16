"""El chat por polling y los bloqueos (spec 007).

Rutas:

- `GET  /api/chat/messages` — lo nuevo desde la última consulta.
- `POST /api/chat/messages` — escribir.
- `GET  /api/chat/limits` — cuánto cabe en un mensaje.
- `POST /api/users/{id}/block` — bloquear, un paso y sin confirmar.
- `DELETE /api/users/{id}/block` — desbloquear.

**Ninguna ruta registra la IP** (R-009). No hay middleware que la lea ni columna
donde guardarla. El chat es un dato personal (§6.5) y la IP lo sería también:
guardarla no aporta nada al producto y crea una obligación de borrarla que aquí
nadie está mirando.

**No hay ruta de reporte** (R-007, §6.8). Sin moderadores, un reporte no tiene
destinatario. `tests/test_no_report.py` recorre el mapa de rutas de la
aplicación y falla si aparece una.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_current_user
from app.errors import (
    BLOCKED_CANNOT_WRITE,
    CANNOT_BLOCK_SELF,
    USER_NOT_FOUND,
    ApiError,
)
from app.models.chat import ChatMessage, MessageKind
from app.models.user import User
from app.schemas.social import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatMessagesResponse,
    MessageLimits,
)
from app.services.blocks import authors_blocking, block, unblock, user_exists
from app.services.chat_retention import now_utc, purge_expired, visible_messages

router = APIRouter(tags=["chat"])


@router.get(
    "/chat/messages",
    response_model=ChatMessagesResponse,
    summary="Mensajes nuevos desde la última consulta",
)
def read_messages(
    since: datetime | None = Query(
        default=None,
        description="Marca de tiempo de la última consulta (ISO 8601)",
    ),
    limit: int = Query(default=50, ge=1, le=200),
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> ChatMessagesResponse:
    """Los mensajes posteriores a `since` (R-003).

    **Exige sesión** (R-009). El chat es comunidad: tiene que haber alguien
    dentro para que tenga sentido, y el modo espectador (§2.4) es para mirar la
    clasificación, que no es lo mismo que estar en una conversación.
    """
    # La retención se aplica al leer (R-008). Lo que caducó no se descarga ni se
    # ve nunca, que es el efecto que importa.
    purge_expired(db, now_utc())

    hidden_authors = authors_blocking(db, user.id)
    messages = visible_messages(db, since, hidden_authors)[:limit]

    return ChatMessagesResponse(
        messages=[
            _to_response(message, user, _aliases_for(db, messages))
            for message in messages
        ],
        # Se devuelve el momento de la consulta, no el del último mensaje: si
        # no hay mensajes nuevos, el cliente igualmente avanza su marca. Si no,
        # volvería a preguntar siempre por el mismo instante y no avanzaría.
        poll_from=now_utc(),
    )


@router.post(
    "/chat/messages",
    response_model=ChatMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Escribe un mensaje",
)
def write_message(
    payload: ChatMessageRequest,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> ChatMessageResponse:
    """Guarda un mensaje de texto plano (R-004).

    Que sea texto plano no se comprueba aquí sino en `ChatMessageRequest`, que es
    donde puede rechazarse con un mensaje escrito para la persona. Aquí se
    comprueba lo que depende de quién escribe.
    """
    # R-006: un bloqueado no puede enviar mensajes al que le bloqueó. El chat es
    # una conversación única y pública, así que un mensaje llega a todo el mundo:
    # si alguien te ha bloqueado, cualquier texto tuyo llegaría a esa persona.
    # La única forma de que el bloqueo signifique algo es impedir que escribas.
    #
    # El motivo dice **qué ha pasado y qué hacer**, sin decir quién lo bloqueó
    # (§6.5): esta persona ya es el único dato de alguien más, y confirmar que
    # ha bloqueado a alguien sería filtrar su uso de la plataforma.
    if authors_blocking(db, user.id):
        raise ApiError(BLOCKED_CANNOT_WRITE, status.HTTP_403_FORBIDDEN)

    message = ChatMessage(author_id=user.id, body=payload.body, kind=MessageKind.USER)
    db.add(message)
    db.commit()

    return _to_response(message, user, {user.id: user.alias})


@router.get("/chat/limits", response_model=MessageLimits, summary="Límites del mensaje")
def chat_limits() -> MessageLimits:
    """Cuántos caracteres caben en un mensaje.

    El límite es del servidor (§2.4) y no del cliente: si estuviera escrito en
    el cliente, cambiarlo en el backend no lo cambiaría en la pantalla y el
    contador mentiría sin que nadie se entere.
    """
    return MessageLimits()


@router.post("/users/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
def block_user(
    user_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Bloquea a `user_id`. Inmediato y sin confirmación (R-006).

    No hay diálogo de «¿seguro?» a propósito. El requisito lo dice sin
    rodeos: pedir confirmación justo cuando alguien te está molestando es
    exactamente lo contrario de útil.
    """
    if user_id == user.id:
        raise ApiError(CANNOT_BLOCK_SELF, status.HTTP_400_BAD_REQUEST)

    if not user_exists(db, user_id):
        raise ApiError(USER_NOT_FOUND, status.HTTP_404_NOT_FOUND)

    block(db, user.id, user_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/users/{user_id}/block", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: int,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Deshace el bloqueo. Vuelve a poder ver sus mensajes y escribir."""
    unblock(db, user.id, user_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _to_response(
    message: ChatMessage, viewer: User, aliases: dict[int, str]
) -> ChatMessageResponse:
    """Monta la respuesta de un mensaje.

    El alias sale del mapa que trae la consulta y no de una consulta por
    mensaje: con veinte mensajes nuevos serían veinte idas a la base de datos, y
    el polling las repite cada diez segundos.
    """
    return ChatMessageResponse(
        message_id=message.id,
        author_id=message.author_id,
        alias=aliases.get(message.author_id) if message.author_id is not None else None,
        body=message.body,
        kind=message.kind,
        created_at=message.created_at,
        is_mine=message.author_id is not None and message.author_id == viewer.id,
    )


def _aliases_for(db: Session, messages: list[ChatMessage]) -> dict[int, str]:
    """Alias de todos los autores de este trozo, en una sola consulta."""
    author_ids = {m.author_id for m in messages if m.author_id is not None}

    if not author_ids:
        return {}

    rows = db.execute(select(User.id, User.alias).where(User.id.in_(author_ids))).all()

    return {row[0]: row[1] for row in rows}