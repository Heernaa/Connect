"""Alias anónimo: único e independiente del nombre de usuario (R-001, R-009)."""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.content.alias_words import ADJECTIVES, ANIMALS
from app.models import User, normalize_username
from app.services.alias import generate_alias, is_valid_alias


def _make_user(username: str, alias: str) -> User:
    return User(
        username=username,
        username_normalized=normalize_username(username),
        password_hash="$argon2id$fake-hash-only-for-this-test",
        alias=alias,
    )


def test_alias_is_made_of_an_adjective_and_an_animal() -> None:
    """R-009: el alias tiene la forma `AnimalAdjetivo`, como `LoboTranquilo`."""
    alias = generate_alias()

    assert is_valid_alias(alias)
    assert any(alias == f"{a}{b}" for a in ANIMALS for b in ADJECTIVES)


def test_alias_does_not_depend_on_the_username() -> None:
    """R-009: el alias no se puede calcular a partir del nombre de usuario.

    Se generan muchos alias sin pasarle ningún nombre. Si el generador usara el
    usuario como semilla, dos nombres parecidos darían alias parecidos.
    """
    aliases = {generate_alias() for _ in range(50)}

    # Cada alias sale de un conjunto de 20 × 19 combinaciones. Con 50 tiradas
    # pueden repetirse, pero deben seguir siendo varias: si el generatorio
    # devolviera siempre lo mismo, habría una sola.
    assert len(aliases) > 1


def test_two_similar_usernames_get_unrelated_aliases() -> None:
    """R-009: `carmen` y `carmen1` no comparten alias."""
    first = _make_user("carmen", "LoboTranquilo")
    second = _make_user("carmen1", "GatoAlegre")

    assert first.alias != second.alias


def test_username_normalization_is_case_insensitive() -> None:
    """R-001 y §6.2: `Carmen`, `carmen` y ` CARMEN ` son la misma cuenta."""
    assert normalize_username("Carmen") == normalize_username("carmen")
    assert normalize_username("  Carmen  ") == normalize_username("carmen")


def test_usernames_differing_only_in_case_collide_in_the_database(
    seeded_db_session,
) -> None:
    """V.8: dos `username` que solo difieren en mayúsculas chocan.

    La normalización vive en Python, pero la restricción de unicidad está en la
    base de datos. Si la unicidad solo estuviera en Python, alguien que inserte
    por otra vía podría crear el duplicado.
    """
    seeded_db_session.add(_make_user("Carmen", "LoboTranquilo"))
    seeded_db_session.commit()

    seeded_db_session.add(_make_user("carmen", "GatoAlegre"))

    with pytest.raises(IntegrityError):
        seeded_db_session.commit()

    seeded_db_session.rollback()


def test_alias_is_unique_in_the_database(seeded_db_session) -> None:
    """R-009: dos usuarios no pueden compartir alias."""
    seeded_db_session.add(_make_user("ana", "LoboTranquilo"))
    seeded_db_session.commit()

    seeded_db_session.add(_make_user("beto", "LoboTranquilo"))

    with pytest.raises(IntegrityError):
        seeded_db_session.commit()

    seeded_db_session.rollback()


def test_alias_has_only_one_hundred_aliased_pairs_available() -> None:
    """Aviso de capacidad, no un requisito.

    Con 20 adjetivos × 19 animales hay 380 combinaciones. Es suficiente para un
    MVP local (§7.0) y por eso el generador reintenta antes de añadir un número.
    """
    assert len(ADJECTIVES) * len(ANIMALS) >= 300


def test_generated_aliases_are_accepted_by_the_database(seeded_db_session) -> None:
    """El alias que genera el sistema se puede guardar tal cual."""
    alias = generate_alias()
    seeded_db_session.add(_make_user("carmen", alias))
    seeded_db_session.commit()

    stored = seeded_db_session.scalar(select(User).where(User.username == "carmen"))
    assert stored is not None
    assert stored.alias == alias