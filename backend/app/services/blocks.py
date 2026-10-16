"""Bloqueos entre usuarios (R-006, §6.8).

Sin moderación, el bloqueo es **lo único** que protege (§6.8). Por eso está
pensado para que funcione en un solo paso y sin confirmación: el requisito
justifica ir contra la regla general del proyecto de pedir «¿seguro?» antes de
algo destructivo, porque el momento en el que alguien aprieta ese botón es
precisamente el momento en el que le están molestando.

Efecto de un bloqueo, en las dos direcciones:

- El bloqueado **no puede** enviar mensajes al que le bloqueó.
- El bloqueado **deja de ver** los mensajes del que le bloqueó.

Las dos cosas salen de la **misma fila**. Se guarda una dirección y las
consultas miran las dos; guardar dos filas por bloqueo duplicaría el mismo hecho
y la tabla acabaría con un «bloqueado pero visible» que nadie sabe arreglar.
"""

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.chat import UserBlock
from app.models.user import User

#: Los mensajes de bloqueo y de error viven en `app/errors.py`, junto al resto,
#: porque son lo que va a leer una persona. Aquí solo está la lógica.


def is_blocking(db: Session, blocker_id: int, blocked_id: int) -> bool:
    """Si `blocker_id` ha bloqueado a `blocked_id`."""
    return (
        db.scalar(
            select(UserBlock.id).where(
                UserBlock.blocker_id == blocker_id, UserBlock.blocked_id == blocked_id
            )
        )
        is not None
    )


def block(db: Session, blocker_id: int, blocked_id: int) -> bool:
    """Bloquea a `blocked_id`. Devuelve si creaba el bloqueo.

    Si ya estaba bloqueado devuelve `False` y no toca nada: pulsar dos veces el
    botón no da error, simplemente no cambia nada. Un error aquí sería peor,
    porque invitaría a alguien a pensar que el botón está roto.
    """
    if is_blocking(db, blocker_id, blocked_id):
        return False

    db.add(UserBlock(blocker_id=blocker_id, blocked_id=blocked_id))
    db.commit()

    return True


def unblock(db: Session, blocker_id: int, blocked_id: int) -> bool:
    """Deshace el bloqueo. Devuelve si había algo que deshacer."""
    existing = db.scalar(
        select(UserBlock).where(
            UserBlock.blocker_id == blocker_id, UserBlock.blocked_id == blocked_id
        )
    )

    if existing is None:
        return False

    db.delete(existing)
    db.commit()

    return True


def blocked_by(db: Session, user_id: int) -> list[int]:
    """A quién ha bloqueado `user_id`.

    Se usa para avisar a quien escribe: si está en la lista, no puede mandar.
    """
    return list(
        db.scalars(select(UserBlock.blocked_id).where(UserBlock.blocker_id == user_id))
    )


def authors_blocking(db: Session, user_id: int) -> list[int]:
    """De quién está bloqueado `user_id`: sus mensajes no se ven.

    Esta lista es la que se aplica a la consulta del chat. Se calcula para el
    caso más común —casi siempre vacía— y entonces no se aplica ningún filtro
    en la base de datos.
    """
    return list(
        db.scalars(select(UserBlock.blocker_id).where(UserBlock.blocked_id == user_id))
    )


def blocked_between(db: Session, first_id: int, second_id: int) -> bool:
    """Si entre estos dos usuarios hay un bloqueo en alguna dirección.

    Se usa para lo que no tiene que ver con el chat: si estás en su lista de
    bloqueados, no puedes escribirle. Que el bloqueo sea bidireccional en la
    práctica significa que **cualquiera de los dos** puede cortar la
    conversación, no solo quien empezó.
    """
    return (
        db.scalar(
            select(UserBlock.id)
            .where(
                or_(
                    (UserBlock.blocker_id == first_id) & (UserBlock.blocked_id == second_id),
                    (UserBlock.blocker_id == second_id) & (UserBlock.blocked_id == first_id),
                )
            )
            .limit(1)
        )
        is not None
    )


def user_exists(db: Session, user_id: int) -> bool:
    """Si ese identificador corresponde a alguien.

    Se comprueba **antes** de bloquear para poder decir «ese usuario no existe»
    en lugar de dejar un bloqueo a un identificador que no es de nadie. Sin esto,
    los bloqueos se acumularían contra usuarios borrados.
    """
    return db.get(User, user_id) is not None