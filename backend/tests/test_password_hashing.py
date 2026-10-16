"""Contraseñas hasheadas, nunca cifradas (§6.2, R-001, R-010).

Estos tests leen la base de datos real. No vale con comprobar que una función
devuelve algo: lo que importa es lo que queda **guardado**.
"""

import pytest

from app.models.user import User, normalize_username
from app.security.passwords import hash_password, needs_rehash, verify_password

pytestmark = pytest.mark.integration

#: Cómo empieza un hash de argon2. Si algún día se cambia de librería, este test
#: avisa en lugar de dejar que cambie el formato en silencio.
ARGON2ID_PREFIX = "$argon2id$"


def _create_user(db_session, username: str, password: str) -> User:
    """Crea un usuario con un alias derivado del nombre, para que cada uno sea
    distinto: el alias es único en la base de datos."""
    user = User(
        username=username,
        username_normalized=normalize_username(username),
        password_hash=hash_password(password),
        alias=f"AliasDe{username}",
    )
    db_session.add(user)
    db_session.commit()
    return user


def test_stored_value_is_not_the_plaintext_password(db_session) -> None:
    """R-010: en la base de datos no está la contraseña en claro."""
    password = "mi clave secreta"
    _create_user(db_session, "carmen", password)

    stored = db_session.query(User).filter(User.username == "carmen").one().password_hash

    assert stored != password
    assert password not in stored


def test_stored_value_is_an_argon2id_hash(db_session) -> None:
    """R-001 y V.2: lo guardado es argon2id, no la contraseña."""
    _create_user(db_session, "carmen", "una contraseña")

    stored = db_session.query(User).filter(User.username == "carmen").one().password_hash

    assert stored.startswith(ARGON2ID_PREFIX)


def test_two_users_with_the_same_password_have_different_hashes(db_session) -> None:
    """R-010 y V.3: el salt es único por contraseña.

    Si dos contraseñas iguales dieran el mismo hash, una tabla robada serviría
    para saber qué cuentas comparten contraseña.
    """
    first = _create_user(db_session, "carmen", "la misma contraseña")
    second = _create_user(db_session, "beto", "la misma contraseña")

    assert first.password_hash != second.password_hash


def test_verify_accepts_the_right_password() -> None:
    assert verify_password("la contraseña correcta", hash_password("la contraseña correcta"))


def test_verify_rejects_a_wrong_password() -> None:
    assert not verify_password("otra cosa", hash_password("la contraseña correcta"))


def test_verify_rejects_against_a_damaged_hash_without_crashing() -> None:
    """Un hash corrupto en la base de datos no debe tumbar la API."""
    assert not verify_password("lo que sea", "no-es-un-hash")


def test_needs_rehash_recognises_a_hash_with_current_parameters() -> None:
    assert not needs_rehash(hash_password("una contraseña"))


def test_needs_rehash_survives_a_damaged_hash() -> None:
    assert not needs_rehash("no-es-un-hash")