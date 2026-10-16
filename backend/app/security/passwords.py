"""Hash de contraseñas con **argon2id** (§6.2).

> Las contraseñas se guardan HASHEADAS, nunca cifradas.
>
> Cifrar significa que se puede revertir con una clave: quien lea la tabla de
> usuarios lee todas las contraseñas. Hashing es irreversible: solo se puede
> comprobar si lo que alguien teclea coincide con lo que hay guardado.

El módulo es tonto a propósito: hashear y verificar, nada más. Quien decide
políticas vive en otro sitio.
"""

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

#: argon2id frente a argon2i y argon2d: el único resistente a ataques con GPU.
#:
#: Los parámetros son los recomendados por OWASP para un servidor. Son altos a
#: propósito: hacen que probar una contraseña sea lento. En el contenedor de
#: desarrollo se pueden subir para que los tests no tarden segundos.
_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Devuelve el hash de una contraseña, con su salt.

    El salt lo genera la librería automáticamente y es distinto en cada llamada:
    dos personas con la misma contraseña tienen hashes distintos, y una tabla
    robada no sirve para montar una tabla de contraseñas conocidas.
    """
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Indica si la contraseña corresponde al hash guardado.

    Devuelve `True` o `False`, nunca la contraseña ni el hash. Quien llama no
    puede saber con qué se comparó.
    """
    try:
        _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return True


def needs_rehash(password_hash: str) -> bool:
    """Indica si un hash se ha quedado viejo y conviene rehacerlo.

    Permite subir el coste de computo en el futuro sin invalidar las cuentas que
    ya existen: se rehashea en el siguiente inicio de sesión.
    """
    try:
        return _password_hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return False