"""Retención del chat: 90 días, y por qué se borra al leer (R-008, §6.5).

Los mensajes son datos personales (§6.5). Pasados los 90 días se borran.

**Se borran al leer, no con un proceso en segundo plano.** El entorno es local
(§7.0) y no tiene planificador: para que un mensaje caducado desapareciera solo
habría que añadir el primer `cron`, `APScheduler` o un proceso más al
`docker-compose`. Eso es infraestructura nueva, y §6.7 obliga a justificar cada
dependencia que entra. Aquí no se justifica: el efecto que importa — que un
mensaje pasado el plazo no se ve y no se descarga — se consigue equally bien
borrándolo en la misma consulta que lo lee.

La diferencia real entre las dos opciones: con un proceso, los datos würden
existir en la base de datos hasta que pasara. Con borrado perezoso, **no están**
en cuanto se llega su edad, ni aunque nadie vuelva a mirar el chat. Para un dato
que la constitución llama personal, quedarse con él más tiempo del acordado es
peor que no purgar de forma agresiva.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.chat import ChatMessage

#: Días que se conserva un mensaje (§0.1, decidido el 2026-10-16).
RETENTION_DAYS = 90


def expiry_cutoff(now: datetime) -> datetime:
    """El momento anterior al cual un mensaje ya no se conserva.

    Separado para poder probarlo con una fecha fija: los tests pasan el `now`
    que quieren, no el reloj del sistema.
    """
    return now - timedelta(days=RETENTION_DAYS)


def purge_expired(db: Session, now: datetime) -> int:
    """Borra los mensajes más antiguos que el plazo y devuelve cuántos eran.

    Se llama al leer el chat. Devolver el número no es por curiosidad: permite
    que un test compruebe que el borrado ocurrió sin tener que contar filas, y en
    producción el valor se ignora.
    """
    result = db.execute(delete(ChatMessage).where(ChatMessage.created_at < expiry_cutoff(now)))
    db.commit()

    return int(result.rowcount or 0)


def visible_messages(
    db: Session, since: datetime | None, blocked_ids: list[int]
) -> list[ChatMessage]:
    """Los mensajes posteriores a `since`, en orden, sin los de quien bloqueó.

    Es una **consulta**, no un filtro en Python. Si se filtrara después de
    traerlos todos, el bloqueo dejaría de proteger de verdad, porque los datos
    habrían salido igualmente del servidor. Que no salgan es justo lo que
    significa «deja de ver los mensajes» (R-006).
    """
    query = select(ChatMessage).order_by(ChatMessage.created_at, ChatMessage.id)

    if since is not None:
        query = query.where(ChatMessage.created_at > since)

    if blocked_ids:
        query = query.where(
            # Los mensajes del sistema los ve todo el mundo: no tienen autor y
            # no pueden ser de nadie a quien se haya bloqueado.
            ChatMessage.author_id.is_(None) | ChatMessage.author_id.not_in(blocked_ids)
        )

    return list(db.scalars(query))


def now_utc() -> datetime:
    """El momento actual, en UTC y con zona horaria.

    Centralizado porque comparar fechas con y sin `tzinfo` en Python da un
    `TypeError` en lugar de un resultado: si un test pasa una fecha ingenua y la
    base de datos una con zona, el fallo aparece en la comparación y no se sabe
    de dónde viene. Aquí las fechas llevan siempre zona (§2.1.7).
    """
    return datetime.now(UTC)