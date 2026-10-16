"""Datos personales: el esquema no puede guardarlos (spec 002 · R-002, §6.5).

Este es el test que protege el requisito de **datos mínimos**. No mira el
código: mira las columnas que existen de verdad en PostgreSQL, que es donde un
dato personal se colaría sin que nadie se entere.
"""

import pytest
from sqlalchemy import text

pytestmark = pytest.mark.integration

#: Nombres de columna que significarían guardar un dato personal. Se buscan en
#: todos los usuarios del esquema: si alguien añade `email` a la tabla de
#: usuarios, o `real_name` a cualquier otra, este test falla.
FORBIDDEN_COLUMN_PARTS = (
    "email",
    "e_mail",
    "correo",
    "phone",
    "telefono",
    "telephone",
    "address",
    "direccion",
    "location",
    "ubicacion",
    "geo",
    "latitude",
    "longitude",
    "birth",
    "nacimiento",
    "age",
    "edad",
    "photo",
    "foto",
    "avatar",
    "picture",
    "image",
    "real_name",
    "nombre_real",
    "first_name",
    "last_name",
    "apellido",
    "surname",
    "health",
    "salud",
    "dni",
    "nif",
    "ip_address",
)

#: Lo que sí se guarda. Se fija en positivo para que el test también detecte que
#: el usuario se vació de campos por accidente.
EXPECTED_USER_COLUMNS = {
    "id",
    "username",
    "username_normalized",
    "password_hash",
    "alias",
    "created_at",
}


def test_users_table_has_exactly_the_expected_columns(seeded_db_session) -> None:
    """R-001 y R-002: solo identificador, alias, hash y fecha de alta."""
    rows = seeded_db_session.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'users'
            """
        )
    ).scalars()

    assert set(rows) == EXPECTED_USER_COLUMNS


def test_no_table_stores_a_personal_data_column(seeded_db_session) -> None:
    """R-002: ninguna columna de ninguna tabla guarda un dato personal."""
    rows = seeded_db_session.execute(
        text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            """
        )
    ).all()

    offenders = [
        f"{table}.{column}"
        for table, column in rows
        if any(part in column.lower() for part in FORBIDDEN_COLUMN_PARTS)
    ]

    assert offenders == [], (
        "Estas columnas guardarían datos personales, que §6.5 prohíbe: "
        f"{offenders}"
    )


def test_the_chat_tables_store_no_ip(seeded_db_session) -> None:
    """R-009: la IP de quien escribe no se guarda en ninguna parte del chat.

    La comprobación general de arriba busca `ip_address`, que es el nombre
    habitual de esa columna. Esta es más estricta a propósito: **cualquier**
    columna cuyo nombre contenga `ip` está prohibida, así que tampoco pasaría
    una que se llamara `client_ip`, `ip_seen` o `remote_addr`.

    No se limita a las tablas del chat porque es una regla general del proyecto:
    la IP es un dato personal (§6.5) y no hay ningún sitio donde este producto
    necesite guardarla. No hay excepciones que permitir: una columna que guarde
    una IP es una IP guardada, llámese como se llame.

    El nombre se parte en trozos y se comparan los enteros. Buscar la cadena
    «ip» a pelo no funciona: `games.description` la lleva dentro («descr-ipt-ion»)
    y el test señalaría una columna que no tiene nada que ver.
    """
    rows = seeded_db_session.execute(
        text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            """
        )
    ).all()

    ip_words = {"ip", "ips", "client_ip", "remote_ip", "ip_address", "ipaddr"}

    offenders = [
        f"{table}.{column}"
        for table, column in rows
        if column.lower() in ip_words or column.lower().endswith("_ip")
    ]

    assert offenders == [], (
        "Estas columnas guardarían la IP de alguien, que R-009 prohíbe: "
        f"{offenders}"
    )


def test_the_chat_tables_are_exactly_the_expected_ones(seeded_db_session) -> None:
    """R-007: el chat son dos tablas y ni una más.

    Una tabla de reportes, de silencios o de «usuarios denunciados» sería una
    tabla de moderación sin moderadores (§6.8): ocuparía espacio, guardaría
    datos de otras personas y no habría nadie que la mirara. Fijar el conjunto
    exacto es lo que hace que añadir una se note.
    """
    rows = seeded_db_session.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
              AND (table_name LIKE '%chat%' OR table_name LIKE '%block%')
            """
        )
    ).scalars()

    assert set(rows) == {"chat_messages", "user_blocks"}


def test_no_table_stores_a_free_text_identity_field(seeded_db_session) -> None:
    """R-002: ni siquiera una columna de texto libre para el nombre real.

    Busca los nombres típicos de una identidad completa, por si alguien añadiera
    una columna con un nombre que no estuviera en la lista anterior.

    `users.username` queda fuera a propósito: ahí se guarda el nombre de usuario
    que elige la persona, que §2.2 exige y que no se muestra en ningún sitio.
    `games.name` guarda el nombre **del juego** («Paraulógic»), no el de nadie, y
    por eso es la única excepción de la lista.
    """
    identity_column_names = {
        "name",
        "full_name",
        "real_name",
        "surname",
        "nombre",
        "nombre_completo",
    }

    #: Único sitio donde una columna `name` no guarda el nombre de una persona.
    allowed_tables = {"games"}

    rows = seeded_db_session.execute(
        text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND data_type IN ('text', 'character varying')
            """
        )
    ).all()

    identity_columns = {
        f"{table}.{column}"
        for table, column in rows
        if column.lower() in identity_column_names and table not in allowed_tables
    }

    assert identity_columns == set(), (
        f"Estas columnas de texto podrían guardar el nombre real de alguien: {identity_columns}"
    )