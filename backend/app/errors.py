"""Mensajes de error de la API, en lenguaje llano (§4.1).

Todos los mensajes que ve una persona salen de aquí. Están en español y dicen
qué pasó y qué hacer, sin códigos técnicos: quien los lee es alguien de 70 años
que se ha equivocado al teclear, no alguien leyendo un registro del servidor.
"""

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

#: Longitud mínima de contraseña (§6.2). Vive aquí, junto a los mensajes, porque
#: el texto del error la menciona y el número no puede salir de dos sitios.
MIN_PASSWORD_LENGTH = 8

MIN_USERNAME_LENGTH = 3

#: Starlette ha renombrado este código; el nombre viejo avisa con un aviso que,
#: con `filterwarnings = ["error"]` en pytest, convierte en un fallo de test.
UNPROCESSABLE_CONTENT = 422

#: Un único mensaje para los dos fallos de inicio de sesión (R-007).
#:
#: Si dijeramos «ese usuario no existe» estaríamos confirmando qué nombres de
#: usuario están en uso, que es justo lo que un atacante quiere adivinar (§6.3).
#: Con un solo mensaje, indistinguishable, no se puede hacer esa lista.
INVALID_CREDENTIALS = "El usuario o la contraseña no son correctos."

#: Errores de registro, cada uno con lo que hay que hacer al respecto.
USERNAME_TAKEN = "Ese nombre de usuario ya está en uso. Prueba con otro."
PASSWORD_TOO_SHORT = (
    f"La contraseña necesita al menos {MIN_PASSWORD_LENGTH} caracteres. Usa una frase "
    "que recuerdes con facilidad: no hace falta que tenga símbolos."
)
USERNAME_TOO_SHORT = (
    f"El nombre de usuario necesita al menos {MIN_USERNAME_LENGTH} caracteres."
)
PASSWORD_MISMATCH = "Las dos contraseñas no son iguales. Vuelve a escribirlas."
PASSWORD_BLANK = "La contraseña no puede ser solo espacios."
ACCOUNT_LOCKED = (
    "Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo."
)

#: Se responde 401 cuando hace falta iniciar sesión. No es un error que la
#: persona tenga que corregir: o ha iniciado sesión o no lo ha hecho.
NOT_SIGNED_IN = "No has iniciado sesión."

#: Errores de validación genéricos.
FIELDS_REQUIRED = "Faltan datos obligatorios."
GENERIC_ERROR = "Algo no ha ido bien. Inténtalo de nuevo."


def error_response(message: str, status_code: int) -> JSONResponse:
    """Construye la respuesta de error.

    El cuerpo siempre tiene la misma forma, con `message` en claro, para que el
    cliente pueda mostrarlo tal cual sin tener que interpretar códigos.
    """
    return JSONResponse(status_code=status_code, content={"message": message})


class ApiError(Exception):
    """Error de la API con un mensaje pensado para quien lo va a leer.

    Las rutas lanzan esta excepción en lugar de devolver una respuesta a mano, y
    un único manejador la convierte. Así cada ruta declara solo su caso de éxito
    en su modelo de respuesta, y ningún camino puede devolver una forma
    distinta de la esperada por error.
    """

    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def api_error_handler(request: Request, error: Exception) -> JSONResponse:
    """Convierte una `ApiError` en la respuesta que ve la persona."""
    return error_response(error.message, error.status_code)


#: Los errores que lanza `HTTPException` con el detalle de Starlette (`Not Found`,
#: `Method Not Allowed`) son texto interno en inglés. Se sustituyen por su
#: equivalente en claro, para que **todos** los errores tengan la misma forma y en
#: el mismo idioma (§4.1).
STANDARD_DETAILS = {
    "Not Found",
    "Method Not Allowed",
    "Forbidden",
    "Unauthorized",
}

HTTP_STATUS_MESSAGES = {
    401: NOT_SIGNED_IN,
    403: "No tienes permiso para hacer esto.",
    404: "No se ha encontrado lo que buscas.",
    405: "Esta acción no está disponible.",
}


async def http_exception_handler(request: Request, error: Exception) -> JSONResponse:
    """Da a los errores HTTP la misma forma que al resto de errores."""
    status_code = getattr(error, "status_code", 500)
    detail = getattr(error, "detail", None)

    if not isinstance(detail, str) or detail in STANDARD_DETAILS:
        message = HTTP_STATUS_MESSAGES.get(status_code, GENERIC_ERROR)
    else:
        message = detail

    return error_response(message, status_code)


async def validation_error_handler(
    request: Request, error: Exception
) -> JSONResponse:
    """Convierte los errores de validación de FastAPI en algo legible (R-007).

    Por defecto FastAPI devuelve algo como `{"detail": [{"loc": ["body", "field"],
    "msg": "Field required", "type": "missing"}]}`. Eso es para quien desarrolla
    la API. Quien se equivoca al registrarse necesita otra cosa: qué dato falta
    y qué hacer.

    El campo `field` se traduce solo para los tres nombres que la interfaz usa.
    Los campos desconocidos se devuelven tal cual, sin inventar una traducción.
    """
    errors = error.errors() if isinstance(error, RequestValidationError) else []
    details = [item for item in errors if item.get("type") == "missing"]

    if details:
        return error_response(FIELDS_REQUIRED, UNPROCESSABLE_CONTENT)

    # Se recoge el primer mensaje de Pydantic, que ya viene redactado para la
    # persona que lo va a leer: los validadores de `schemas/auth.py` escriben sus
    # mensajes en español y en lenguaje llano.
    first_message = _first_readable_message(errors)

    return error_response(first_message, UNPROCESSABLE_CONTENT)


def _first_readable_message(errors: list[dict]) -> str:
    """Elige el mensaje que se va a mostrar.

    Cuando un validador propio lanza un `ValueError`, Pydantic lo envuelve y el
    mensaje llega como `Value error, La contraseña necesita al menos 8
    caracteres...`. Se quita ese prefijo, que es andamiaje interno, y se queda
    con la frase que se ha escrito para la persona que la va a leer.

    Los mensajes que genera Pydantic por su cuenta (validaciones estándar) sí se
    descartan: son técnicos y en inglés.
    """
    for item in errors:
        message = item.get("msg")
        if not isinstance(message, str):
            continue

        if message.startswith(VALUE_ERROR_PREFIX):
            return message[len(VALUE_ERROR_PREFIX) :]

        if not _is_generated_by_pydantic(message):
            return message

    return GENERIC_ERROR


#: Prefijo que Pydantic añade a los mensajes de los validadores propios.
VALUE_ERROR_PREFIX = "Value error, "


def _is_generated_by_pydantic(message: str) -> bool:
    """Si el mensaje lo ha escrito Pydantic y no el proyecto.

    Se distingue por el patrón, no por el idioma: si mañana se valida en inglés,
    los mensajes propios seguirán siendo los que no empiecen por estas formas.
    """
    pydantic_prefixes = (
        "String should",
        "Input should",
        "Field required",
        "Value error,",
        "Assertion failed",
    )
    return message.startswith(pydantic_prefixes)