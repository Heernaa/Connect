"""Registro, inicio de sesión y cierre de sesión (§2.2, §6.2, §6.3)."""

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.dependencies import get_current_user, get_db, require_current_user
from app.errors import (
    ACCOUNT_LOCKED,
    INVALID_CREDENTIALS,
    NOT_SIGNED_IN,
    PASSWORD_MISMATCH,
    UNPROCESSABLE_CONTENT,
    USERNAME_TAKEN,
    ApiError,
)
from app.models.auth import AuthSession, LoginAttempt
from app.models.user import User, normalize_username
from app.schemas.auth import LoginRequest, LogoutResponse, RegisterRequest, UserResponse
from app.schemas.social import DeleteAccountResponse
from app.security.passwords import hash_password, verify_password
from app.security.sessions import (
    SESSION_COOKIE_NAME,
    clear_session_cookie,
    expires_at,
    generate_token,
    hash_token,
    set_session_cookie,
    unsign_cookie_value,
)
from app.services.alias import MAX_ALIAS_ATTEMPTS, generate_alias

router = APIRouter(prefix="/auth", tags=["auth"])

#: Intentos fallidos seguidos antes de bloquear (§6.3).
MAX_FAILED_ATTEMPTS = 5

#: Ventana en la que se cuentan los fallos.
LOCKOUT_WINDOW = timedelta(minutes=15)

#: Hash de una contraseña que no existe. Está aquí para que comprobar la
#: contraseña tarde lo mismo exista o no el usuario: si el usuario no existiera y
#: se saliera sin hashear nada, el tiempo de respuesta revelaría qué nombres de
#: usuario están registrados (R-007).
#:
#: Es un argon2id con un valor interno cualquiera: hashear cuesta lo mismo que
#: sea una cuenta real o no.
DUMMY_PASSWORD_HASH = (
    "$argon2id$v=19$m=65536,t=3,p=4$Y29ubm8rbm90cmVhbGhhc2V2YWx1ZQ$"
    "3R1cXVlcm90bm90ZXJlYWxub3RyZWVxdWFsdmFscXVl"
)


def _register_failure(db: Session, username_normalized: str) -> None:
    """Guarda un intento fallido."""
    db.add(LoginAttempt(username_normalized=username_normalized))
    db.commit()


def _is_locked_out(db: Session, username_normalized: str) -> bool:
    """Indica si hay demasiados intentos fallidos recientes.

    Se cuentan solo los fallos de la última media hora. Los antiguos no cuentan:
    sin eso, una cuenta con cinco fallos en toda su vida quedaría bloqueada para
    siempre.
    """
    window_start = datetime.now(UTC) - LOCKOUT_WINDOW

    recent_failures = db.scalar(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.username_normalized == username_normalized,
            LoginAttempt.attempted_at >= window_start,
        )
    )

    return bool(recent_failures) and recent_failures >= MAX_FAILED_ATTEMPTS


def _clear_failures(db: Session, username_normalized: str) -> None:
    """Borra los intentos fallidos. Se llama al iniciar sesión correctamente."""
    db.execute(delete(LoginAttempt).where(LoginAttempt.username_normalized == username_normalized))
    db.commit()


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crea una cuenta nueva",
)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    """Crea una cuenta y devuelve el alias anónimo.

    No pide correo: es una decisión de producto con su riesgo asumido (§6.3).
    """
    if payload.password != payload.password_confirmation:
        raise ApiError(PASSWORD_MISMATCH, UNPROCESSABLE_CONTENT)

    username_normalized = normalize_username(payload.username)

    already_taken = db.scalar(
        select(User.id).where(User.username_normalized == username_normalized)
    )
    if already_taken is not None:
        raise ApiError(USERNAME_TAKEN, status.HTTP_409_CONFLICT)

    # El alias es único, así que se puede repetir la generación si el primero ya
    # está ocupado (R-009).
    user = _create_user_with_unique_alias(db, payload, username_normalized)

    return UserResponse(username=user.username, alias=user.alias)


def _create_user_with_unique_alias(
    db: Session, payload: RegisterRequest, username_normalized: str
) -> User:
    """Crea el usuario probando alias distintos hasta encontrar uno libre.

    La contraseña se hashea **una sola vez**, antes del bucle: hashear es la parte
    cara y no depende del alias que se pruebe.
    """
    password_hash = hash_password(payload.password)

    for _ in range(MAX_ALIAS_ATTEMPTS):
        candidate = User(
            username=payload.username,
            username_normalized=username_normalized,
            password_hash=password_hash,
            alias=generate_alias(),
        )
        db.add(candidate)
        try:
            db.commit()
        except IntegrityError:
            # Choca el alias, o el nombre de usuario si otra persona se ha
            # registrado entre la comprobación y aquí. Se deshace y se reintenta.
            db.rollback()
            continue
        return candidate

    raise ApiError(
        "No se ha podido crear la cuenta. Inténtalo de nuevo.",
        status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@router.post(
    "/login",
    response_model=UserResponse,
    summary="Inicia sesión",
)
def login(
    payload: LoginRequest, response: Response, db: Session = Depends(get_db)
) -> UserResponse:
    """Comprueba las credenciales y abre sesión.

    El fallo es **siempre el mismo**, exista el usuario o no (R-007). Decir «ese
    usuario no existe» serviría para ir anotando qué nombres hay registrados,
    que es justo lo que un atacante quiere.
    """
    username_normalized = normalize_username(payload.username)

    if _is_locked_out(db, username_normalized):
        raise ApiError(ACCOUNT_LOCKED, status.HTTP_423_LOCKED)

    user = db.scalar(select(User).where(User.username_normalized == username_normalized))

    # Se comprueba la contraseña **aunque no exista el usuario**, contra un hash
    # de mentira con el mismo coste. Si se saliera sin comprobar, el tiempo de
    # respuesta ya revelaría qué nombres están registrados.
    stored_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    password_matches = verify_password(payload.password, stored_hash)

    if user is None or not password_matches:
        _register_failure(db, username_normalized)
        raise ApiError(INVALID_CREDENTIALS, status.HTTP_401_UNAUTHORIZED)

    _clear_failures(db, username_normalized)

    token = generate_token()
    db.add(
        AuthSession(user_id=user.id, token_hash=hash_token(token), expires_at=expires_at())
    )
    db.commit()

    set_session_cookie(response, token)

    return UserResponse(username=user.username, alias=user.alias)


@router.post("/logout", response_model=LogoutResponse, summary="Cierra sesión")
def logout(
    request: Request, response: Response, db: Session = Depends(get_db)
) -> LogoutResponse:
    """Revoca la sesión en el servidor y borra la cookie (R-006).

    Revocar en el servidor es lo que hace que cerrar sesión sirva: si solo se
    borrara la cookie, quien la hubiera copiado podría seguir dentro.
    """
    token = unsign_cookie_value(request.cookies.get(SESSION_COOKIE_NAME))
    if token is not None:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))
        db.commit()

    clear_session_cookie(response)

    return LogoutResponse(message="Has cerrado sesión.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Devuelve la cuenta con la que se ha iniciado sesión",
)
def me(current_user: User | None = Depends(get_current_user)) -> UserResponse:
    """Devuelve los datos de la sesión actual, o un error si no hay sesión."""
    if current_user is None:
        raise ApiError(NOT_SIGNED_IN, status.HTTP_401_UNAUTHORIZED)

    return UserResponse(username=current_user.username, alias=current_user.alias)


@router.delete(
    "/me",
    response_model=DeleteAccountResponse,
    summary="Borra la cuenta y todo lo que pertenece a esa persona",
)
def delete_account(
    request: Request,
    response: Response,
    user: User = Depends(require_current_user),
    db: Session = Depends(get_db),
) -> DeleteAccountResponse:
    """Borra la cuenta de quien está dentro (R-010, §6.5).

    Se borra **la fila del usuario** y, por cascada, todo lo que apunta a ella:
    partidas, puntuaciones, sesiones, mensajes y bloqueos. No hay un `DELETE`
    por tabla: dejar esa lista escrita a mano sería una forma de olvidarse de
    algo el día que haya una tabla más.

    No hay vuelta atrás y no hay copia: por eso la interfaz avisa antes y no
    promete que se pueda recuperar. Tampoco hay **exportación**, que es otra
    funcionalidad y otra pantalla, registrada como deuda técnica en §11.

    La cookie se borra, pero sobre todo se revocan las sesiones: una cookie
    que queda en el navegador no sirve si el servidor ya no la acepta.
    """
    user_id = user.id

    token = unsign_cookie_value(request.cookies.get(SESSION_COOKIE_NAME))
    if token is not None:
        db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))

    # Los intentos de inicio de sesión no tienen columna de usuario —guardan el
    # nombre normalizado, no el identificador (§6.3)— y son datos de seguridad que
    # no identificarían a nadie una vez borrada la cuenta. Se dejan.
    db.delete(db.get(User, user_id))
    db.commit()

    clear_session_cookie(response)

    return DeleteAccountResponse(message="Tu cuenta se ha borrado.")