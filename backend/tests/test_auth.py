"""Registro, inicio y cierre de sesión (spec 003 · R-002 a R-010)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models.auth import AuthSession
from app.models.user import User

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration


def register(client: TestClient, username: str = "carmen", password: str = VALID_PASSWORD):
    """Atajo para el registro con confirmación coincidente."""
    return client.post(
        "/api/auth/register",
        json={"username": username, "password": password, "password_confirmation": password},
    )


def login(client: TestClient, username: str, password: str):
    return client.post("/api/auth/login", json={"username": username, "password": password})


def signed_in_client(client: TestClient, username: str = "carmen") -> TestClient:
    """Deja al cliente con una cuenta creada y una sesión abierta."""
    register(client, username)
    assert login(client, username, VALID_PASSWORD).status_code == 200
    return client


# --- Registro (R-003, R-004) ------------------------------------------------


def test_registration_returns_201_with_an_alias(client: TestClient) -> None:
    """V.1: el registro funciona y devuelve el alias anónimo."""
    response = register(client)

    assert response.status_code == 201
    assert response.json()["alias"]


def test_registration_never_returns_the_hash(client: TestClient) -> None:
    """R-002 y V.5: el hash no sale nunca en una respuesta."""
    body = register(client).text

    assert "password" not in body.lower()
    assert "argon2" not in body.lower()


def test_registration_does_not_store_an_email(client: TestClient, db_session: Session) -> None:
    """V.11: el registro no pide correo, y no lo guarda aunque se le mande.

    Se manda un `email` extra a propósito. Si la API lo aceptara en silencio,
    existiría la puerta para empezar a guardarlo (§6.5), que es justo lo que este
    test cierra.
    """
    response = client.post(
        "/api/auth/register",
        json={
            "username": "carmen",
            "password": VALID_PASSWORD,
            "password_confirmation": VALID_PASSWORD,
            "email": "carmen@ejemplo.com",
        },
    )

    assert response.status_code == 201

    stored_columns = db_session.execute(
        text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users'
            """
        )
    ).scalars()
    assert "email" not in set(stored_columns)


def test_registration_rejects_a_duplicate_username_regardless_of_case(
    client: TestClient,
) -> None:
    """R-003 y §6.2: `Carmen` y `carmen` son la misma cuenta."""
    assert register(client, "Carmen").status_code == 201

    response = register(client, "carmen")

    assert response.status_code == 409
    assert "ya está en uso" in response.json()["message"]


def test_registration_rejects_a_short_password(client: TestClient) -> None:
    """R-004: mínimo 8 caracteres, sin exigir símbolos ni mayúsculas."""
    response = register(client, password="corta")

    assert response.status_code == 422
    assert "8 caracteres" in response.json()["message"]


def test_registration_accepts_a_long_passphrase_without_symbols(client: TestClient) -> None:
    """R-004: una frase sin símbolos es una contraseña válida (§6.3)."""
    assert register(client, password="mi palabra favorita es paz").status_code == 201


def test_registration_rejects_a_password_of_only_spaces(client: TestClient) -> None:
    """Ocho espacios cumplen la longitud mínima y no protegen nada."""
    response = register(client, password="        ")

    assert response.status_code == 422
    assert "espacios" in response.json()["message"]


def test_registration_rejects_mismatched_confirmation(client: TestClient) -> None:
    """R-003: la confirmación tiene que coincidir."""
    response = client.post(
        "/api/auth/register",
        json={
            "username": "carmen",
            "password": VALID_PASSWORD,
            "password_confirmation": "otra distinta",
        },
    )

    assert response.status_code == 422
    assert "no son iguales" in response.json()["message"]


def test_validation_errors_are_in_plain_spanish(client: TestClient) -> None:
    """R-007 y §4.1: los errores se leen, no se descifran.

    Pydantic por defecto respondería `{"detail": [{"msg": "Field required"}]}`.
    Eso es para quien desarrolla la API, no para quien se equivoca al registrarse.
    """
    response = client.post("/api/auth/register", json={"username": "carmen"})

    assert response.status_code == 422
    body = response.json()
    assert set(body) == {"message"}
    assert "Field required" not in body["message"]
    assert "detail" not in body


# --- Inicio de sesión (R-005, R-007, R-008) ----------------------------------


def test_login_succeeds_and_sets_a_protected_cookie(client: TestClient) -> None:
    """R-005 y V.7: la cookie es `httpOnly` y `SameSite=Lax`."""
    register(client)

    response = login(client, "carmen", VALID_PASSWORD)

    assert response.status_code == 200

    set_cookie = response.headers["set-cookie"].lower()
    assert "httponly" in set_cookie
    assert "samesite=lax" in set_cookie
    assert "secure" not in set_cookie, "En local no hay HTTPS (§7.0)."


def test_login_with_wrong_password_fails(client: TestClient) -> None:
    signed_in = register(client)
    assert signed_in.status_code == 201

    assert login(client, "carmen", "no es la contraseña").status_code == 401


def test_login_with_unknown_user_fails_with_the_same_message(client: TestClient) -> None:
    """R-007 y V.6: el mismo mensaje exista el usuario o no.

    Si fueran distintos, se podría usar esta pantalla para ir anotando qué nombres
    de usuario existen (§6.3).
    """
    register(client)

    wrong_password = login(client, "carmen", "no es la contraseña")
    unknown_user = login(client, "nadie", "no es la contraseña")

    assert unknown_user.status_code == wrong_password.status_code == 401
    assert unknown_user.json()["message"] == wrong_password.json()["message"]


def test_login_is_case_insensitive_on_the_username(client: TestClient) -> None:
    """§6.2: `CARMEN` puede entrar en la cuenta `carmen`."""
    register(client, "Carmen")

    assert login(client, "CARMEN", VALID_PASSWORD).status_code == 200


def test_failed_logins_are_locked_out(client: TestClient) -> None:
    """R-008 y V.9: demasiados intentos fallidos bloquean la cuenta."""
    register(client)

    for _ in range(5):
        assert login(client, "carmen", "incorrecta").status_code == 401

    blocked = login(client, "carmen", VALID_PASSWORD)

    assert blocked.status_code == 423
    assert "15 minutos" in blocked.json()["message"]


def test_successful_login_clears_previous_failures(client: TestClient) -> None:
    """Con cuatro fallos seguidos, el quinto intento acierto debe entrar."""
    register(client)

    for _ in range(4):
        login(client, "carmen", "incorrecta")

    assert login(client, "carmen", VALID_PASSWORD).status_code == 200


# --- Sesión (R-005, R-006) --------------------------------------------------


def test_me_returns_the_current_account(client: TestClient) -> None:
    signed_in_client(client)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json()["username"] == "carmen"
    assert "password" not in response.text.lower()


def test_me_without_a_session_is_401(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_logout_invalidates_the_session_on_the_server(client: TestClient) -> None:
    """R-006 y V.8: cerrar sesión invalida en el servidor.

    Se guarda la cookie antes de cerrar y se vuelve a poner después. Si el cierre
    solo borrara la cookie del navegador, esa copia seguiría funcionando.
    """
    signed_in_client(client)
    stolen_cookie = client.cookies.get("connect_session")

    assert client.get("/api/auth/me").status_code == 200

    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401

    client.cookies.clear()
    client.cookies.set("connect_session", stolen_cookie)

    assert client.get("/api/auth/me").status_code == 401


def test_tampered_cookie_does_not_grant_a_session(client: TestClient) -> None:
    """R-005: la cookie está firmada; si se modifica, no vale."""
    signed_in_client(client)
    valid_cookie = client.cookies.get("connect_session")

    client.cookies.clear()
    client.cookies.set("connect_session", valid_cookie.split(".")[0] + ".firmaInventada")

    assert client.get("/api/auth/me").status_code == 401


def test_session_token_is_not_stored_in_plaintext(
    client: TestClient, db_session: Session
) -> None:
    """§6.1: en la base de datos solo está el hash del token de sesión."""
    signed_in_client(client)
    raw_token = client.cookies.get("connect_session").split(".")[0]

    stored_hashes = db_session.scalars(select(AuthSession.token_hash)).all()

    assert stored_hashes
    assert raw_token not in stored_hashes


# --- Alias (R-009, V.10) ----------------------------------------------------


def test_alias_is_independent_of_the_username(client: TestClient, db_session: Session) -> None:
    """R-009 y V.10: el alias no se deriva del nombre de usuario."""
    register(client, "carmen")
    register(client, "carmen2")

    aliases = {
        user.username: user.alias
        for user in db_session.scalars(select(User)).all()
        if user.username in {"carmen", "carmen2"}
    }

    assert len(aliases) == 2
    assert aliases["carmen"] != aliases["carmen2"]
    assert "carmen" not in aliases["carmen"].lower()
    assert "carmen2" not in aliases["carmen2"].lower()


def test_login_attempts_store_no_personal_data(db_session: Session) -> None:
    """§6.5: los intentos de acceso no guardan datos personales.

    Ni la IP ni nada que la identifique. Bloquear por IP exigiría guardarla, y es
    un dato personal que el proyecto no necesita.
    """
    columns = db_session.execute(
        text(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'login_attempts'
            """
        )
    ).scalars()

    assert set(columns) == {"id", "username_normalized", "attempted_at"}