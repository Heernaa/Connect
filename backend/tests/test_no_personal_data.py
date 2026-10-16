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


def test_no_table_stores_a_free_text_identity_field(seeded_db_session) -> None:
    """R-002: ni siquiera una columna de texto libre para el nombre real.

    Busca el patrón típico de un nombre con apellidos, por si alguien lo añadiera
    con un nombre que no estuviera en la lista anterior.
    """
    rows = seeded_db_session.execute(
        text(
            """
            SELECT table_name, column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')
            """
        )
    ).all()

    text_columns = {f"{table}.{column}" for table, column in rows}
    identity_columns = {c for c in text_columns if c.endswith(".name")}

    assert identity_columns == set(), (
        f"Estas columnas de texto podrían guardar el nombre real: {identity_columns}"
    )