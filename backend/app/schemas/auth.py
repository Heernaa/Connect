"""Esquemas de entrada y salida de la autenticación.

El tipado fuerte vive aquí, en la frontera del servidor (§3.2). Y una regla que
no es negociable: **ninguna respuesta lleva `password_hash`**. Se excluye de
forma explícita en `UserResponse`, no por descuido (R-002).
"""

from typing import Annotated

from pydantic import BaseModel, Field, field_validator

from app.errors import (
    MIN_PASSWORD_LENGTH,
    MIN_USERNAME_LENGTH,
    PASSWORD_BLANK,
    PASSWORD_TOO_SHORT,
    USERNAME_TOO_SHORT,
)

MAX_PASSWORD_LENGTH = 200

MAX_USERNAME_LENGTH = 50

# §6.2: mínimo 8 caracteres, sin exigir símbolos ni mayúsculas. Las reglas
# complejas empujan a usar patrones predecibles y hacen que la gente con 75 años
# abandone el registro (§6.3).


class RegisterRequest(BaseModel):
    """Lo que llega al registrarse.

    Las longitudes se comprueban en validadores y no con `Field(min_length=...)`
    a propósito: Pydantic genera su propio mensaje, en inglés y técnico
    («String should have at least 8 characters»), y aquí los mensajes se escriben
    para quien los va a leer (§4.1).
    """

    username: Annotated[str, Field(max_length=MAX_USERNAME_LENGTH)]
    password: Annotated[str, Field(max_length=MAX_PASSWORD_LENGTH)]
    password_confirmation: Annotated[str, Field(max_length=MAX_PASSWORD_LENGTH)]

    @field_validator("username")
    @classmethod
    def _validate_username(cls, value: str) -> str:
        stripped = value.strip()
        if len(stripped) < MIN_USERNAME_LENGTH:
            raise ValueError(USERNAME_TOO_SHORT)
        return stripped

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: str) -> str:
        # Una contraseña de ocho espacios cumple la longitud mínima y no protege
        # nada. Se rechaza con un motivo entendible, no con una regla técnica.
        if not value.strip():
            raise ValueError(PASSWORD_BLANK)
        if len(value) < MIN_PASSWORD_LENGTH:
            raise ValueError(PASSWORD_TOO_SHORT)
        return value


class LoginRequest(BaseModel):
    """Lo que llega al iniciar sesión.

    Aquí no se comprueba la longitud mínima: si alguien que ya tiene cuenta se
    equivoca al teclear y escribe menos de ocho caracteres, el mensaje que
    necesita es «usuario o contraseña incorrectos», no «contraseña demasiado
    corta». Que el error se parezca en los dos casos es además lo que hace
    imposible enumerar cuentas (R-007).
    """

    username: Annotated[str, Field(max_length=MAX_USERNAME_LENGTH)]
    password: Annotated[str, Field(max_length=MAX_PASSWORD_LENGTH)]


class UserResponse(BaseModel):
    """Lo que el cliente ve de una cuenta.

    `password_hash` **no está** y no se puede añadir por descuido: este modelo es
    la única forma de devolver un usuario. Si alguien quisiera devolverlo, tendría
    que escribir un modelo nuevo y esa decisión quedaría a la vista (R-002).
    """

    username: str
    alias: str


class LogoutResponse(BaseModel):
    """Confirmación de cierre de sesión."""

    message: str