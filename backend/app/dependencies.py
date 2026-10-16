"""Dependencias de FastAPI.

`get_current_user` es la que decide quién es la persona que llama. **Siempre
valida en el servidor**: nunca se fía de lo que diga el navegador (§6.1).
"""

from collections.abc import Iterator
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_engine
from app.errors import NOT_SIGNED_IN
from app.models.auth import AuthSession
from app.models.user import User
from app.security.sessions import SESSION_COOKIE_NAME, hash_token, unsign_cookie_value


def get_db() -> Iterator[Session]:
    """Sesión de base de datos por petición.

    Se cierra siempre, también si la petición falla a mitad.
    """
    session = Session(bind=get_engine())
    try:
        yield session
    finally:
        session.close()


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User | None:
    """Devuelve el usuario de la sesión, o `None` si no hay sesión válida.

    Tres comprobaciones, en este orden:

    1. Que la cookie esté firmada con `SECRET_KEY`. Si alguien la ha modificado,
       no hay sesión.
    2. Que exista una sesión con ese token en la base de datos.
    3. Que no esté revocada ni caducada. Aquí es donde cerrar sesión invalida de
       verdad: la cookie sigue en el navegador, pero ya no sirve (R-006).
    """
    token = unsign_cookie_value(request.cookies.get(SESSION_COOKIE_NAME))
    if token is None:
        return None

    auth_session = db.scalar(
        select(AuthSession).where(AuthSession.token_hash == hash_token(token))
    )
    if auth_session is None or not auth_session.is_usable(datetime.now(UTC)):
        return None

    return db.get(User, auth_session.user_id)


def require_current_user(current_user: User | None = Depends(get_current_user)) -> User:
    """Como `get_current_user`, pero exige que haya sesión.

    Para las rutas donde hace falta saber quién llama. Sin sesión, responde 401.
    """
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=NOT_SIGNED_IN
        )

    return current_user