"""Sesiones de usuario: cookie firmada y con estado en el servidor (R-005, R-006).

Cómo funciona, y por qué así:

- Al iniciar sesión se genera un **token aleatorio**. En la base de datos se
  guarda **su hash**, nunca el token. Si alguien lee la tabla de sesiones no
  puede iniciar sesión con ella: no tiene los tokens (§6.1).
- La cookie lleva el token **firmado con `SECRET_KEY`**. Si alguien modifica la
  cookie, la firma no cuadra y la sesión se rechaza.
- La sesión se **caduca** por fecha en la base de datos, y se puede **revocar**
  al cerrar sesión. Eso es lo que permite que cerrar sesión invalide de verdad en
  el servidor: una cookie firmada sola no se puede revocar sin cambiar la clave.

El token en claro solo existe en la cookie del navegador, y por eso la cookie es
`httpOnly`: el JavaScript de la página no puede leerla (§6.2).
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import Response

from app.config import get_settings

#: Nombre de la cookie. No lleva el prefijo `__Host-` porque en desarrollo se
#: sirve por HTTP y ese prefijo exigiría `Secure`, que sin HTTPS dejaría la
#: aplicación sin sesión en local (§7.0).
SESSION_COOKIE_NAME = "connect_session"

#: Cuánto dura una sesión sin tocar nada.
SESSION_MAX_AGE = timedelta(days=30)

#: Bytes de entropía del token. 32 son 256 bits: suficiente para que adivinarlo
#: sea inviable.
TOKEN_BYTES = 32


def generate_token() -> str:
    """Genera un token de sesión aleatorio."""
    return secrets.token_urlsafe(TOKEN_BYTES)


def hash_token(token: str) -> str:
    """Devuelve el hash del token, que es lo que se guarda en la base de datos.

    SHA-256 es aquí correcto y no es el hash débil que §6.2 prohíbe para
    contraseñas: el token ya son 256 bits de entropía, no hay diccionario que
    adivinar, y necesita ser rápido porque se comprueba en cada petición.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def sign_token(token: str) -> str:
    """Devuelve el valor de la cookie: el token más su firma."""
    signature = hmac.new(
        _secret_key().encode("utf-8"), token.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{token}.{signature}"


def unsign_cookie_value(cookie_value: str | None) -> str | None:
    """Comprueba la firma y devuelve el token, o `None` si no es válido.

    Devolver `None` y no lanzar: una cookie manipulada es un caso normal de un
    navegador, no un error que haya que mostrar.
    """
    if not cookie_value or "." not in cookie_value:
        return None

    token, _, signature = cookie_value.partition(".")

    expected = hmac.new(
        _secret_key().encode("utf-8"), token.encode("utf-8"), hashlib.sha256
    ).hexdigest()

    # `compare_digest` compara en tiempo constante: si se comparara con `==`, un
    # atacante podría deducir la firma correcta midiendo cuánto tarda.
    if not hmac.compare_digest(expected, signature):
        return None

    return token


def _secret_key() -> str:
    return get_settings().secret_key


def set_session_cookie(response: Response, token: str) -> None:
    """Escribe la cookie de sesión."""
    settings = get_settings()

    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=sign_token(token),
        max_age=int(SESSION_MAX_AGE.total_seconds()),
        # `httpOnly`: el JavaScript de la página no puede leer la cookie.
        httponly=True,
        # `Lax`: la cookie no viaja al enviar a otro sitio, lo que evita que un
        # enlace externo arrastre la sesión. `Strict` rompería el retorno desde
        # un enlace externo, que es algo normal de hacer.
        samesite="lax",
        # `Secure` solo cuando hay HTTPS. En local el tráfico es HTTP y, si se
        # exigiera `Secure`, el navegador descartaría la cookie y no se podría
        # iniciar sesión (§7.0).
        secure=settings.is_production,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    """Borra la cookie de sesión."""
    settings = get_settings()

    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        path="/",
    )


def expires_at() -> datetime:
    """Devuelve el momento en que caduca una sesión creada ahora."""
    return datetime.now(UTC) + SESSION_MAX_AGE