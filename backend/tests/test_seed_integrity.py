"""Contenido del MVP: el seed debe seguir siendo lo que dice la constitución.

Estos tests verifican un **requisito** (R-009, R-010), no una tabla concreta: si
mañana se cambia de ORM o se reorganizan las tablas, tienen que seguir pasando.
"""

import pytest
from sqlalchemy import func, select, text

from app.models import ParaulogicHint, ParaulogicSet, ParaulogicWord, Riddle, WordleWord
from app.services.paraulogic_rules import InvalidWordError, validate_word
from tests.conftest import read_seed_sql

#: Contenido fijado en la constitución §2.1.8.
EXPECTED_SETS = 1
EXPECTED_WORDS = 21
EXPECTED_HINTS = 21
EXPECTED_WORDLE_WORDS = 1
EXPECTED_RIDDLES = 1

#: Conjunto de letras del MVP.
EXPECTED_LETTERS = "AENRST"

pytestmark = pytest.mark.integration


def _only_set(seeded_db_session) -> ParaulogicSet:
    sets = seeded_db_session.scalars(select(ParaulogicSet)).all()
    assert len(sets) == EXPECTED_SETS, (
        f"Se esperaba {EXPECTED_SETS} conjunto de letras y hay {len(sets)}."
    )
    return sets[0]


def test_mvp_content_has_the_expected_counts(seeded_db_session) -> None:
    """R-009: 1 set, 21 palabras, 21 pistas, 1 palabra de Wordle y 1 acertijo."""
    counts = {
        "sets": seeded_db_session.scalar(select(func.count()).select_from(ParaulogicSet)),
        "words": seeded_db_session.scalar(select(func.count()).select_from(ParaulogicWord)),
        "hints": seeded_db_session.scalar(select(func.count()).select_from(ParaulogicHint)),
        "wordle": seeded_db_session.scalar(select(func.count()).select_from(WordleWord)),
        "riddles": seeded_db_session.scalar(select(func.count()).select_from(Riddle)),
    }

    assert counts == {
        "sets": EXPECTED_SETS,
        "words": EXPECTED_WORDS,
        "hints": EXPECTED_HINTS,
        "wordle": EXPECTED_WORDLE_WORDS,
        "riddles": EXPECTED_RIDDLES,
    }


def test_every_word_can_be_formed_with_the_letters(seeded_db_session) -> None:
    """R-010: cada palabra se forma solo con las letras del conjunto.

    Si alguien edita el seed y añade una palabra con una letra que no está en el
    conjunto, este test falla: la regla del juego está comprobada, no supuesta.
    """
    letters_set = _only_set(seeded_db_session).letters
    words = seeded_db_session.scalars(select(ParaulogicWord.word)).all()

    for word in words:
        validate_word(word, letters_set)


def test_integrity_check_fails_if_the_seed_is_altered(seeded_db_session) -> None:
    """R-010, segunda parte: el test tiene que FALLAR con contenido corrupto.

    Un test de integridad que no falla nunca no está probando nada. Se comprueba
    con una palabra imposible añadida en el propio test, sin tocar el seed.
    """
    letters_set = _only_set(seeded_db_session).letters
    impostor = "PESADO"  # usa la P y la D, que no están en el conjunto

    with pytest.raises(InvalidWordError):
        validate_word(impostor, letters_set)


def test_set_has_at_least_the_required_size(seeded_db_session) -> None:
    """§2.1.8: mínimo 5 letras y 10 palabras. El MVP cumple con margen."""
    letters_set = _only_set(seeded_db_session)
    word_count = seeded_db_session.scalar(select(func.count()).select_from(ParaulogicWord))

    assert len(letters_set.letters) >= 5
    assert word_count >= 10


def test_wordle_word_has_exactly_five_uppercase_letters(seeded_db_session) -> None:
    """R-004: la palabra de Wordle tiene exactamente 5 letras."""
    words = seeded_db_session.scalars(select(WordleWord.word)).all()

    for word in words:
        assert len(word) == 5
        assert word == word.upper()


def test_hints_never_reveal_the_word(seeded_db_session) -> None:
    """R-003: una pista no puede regalar la solución.

    Comprobación literal sobre el texto, no sobre la estructura: si mañana la
    pista se guardara en otro sitio o con otro formato, el test sigue valiendo.
    """
    rows = seeded_db_session.execute(
        select(ParaulogicWord.word, ParaulogicHint.hint_text).join(
            ParaulogicHint, ParaulogicHint.word_id == ParaulogicWord.id
        )
    ).all()

    assert rows, "No hay pistas que comprobar."

    for word, hint_text in rows:
        assert word.upper() not in hint_text.upper(), (
            f"La pista de «{word}» contiene la palabra: «{hint_text}»."
        )


def test_every_word_has_exactly_its_own_hint(seeded_db_session) -> None:
    """R-003: cada palabra tiene su propia pista.

    Si a una palabra se le asignara la pista de otra, quien la pidiera recibiría
    una ayuda que no le sirve: la palabra no encaja con lo que dice la pista.
    """
    pairs = seeded_db_session.execute(
        select(ParaulogicWord.word, ParaulogicHint.hint_text)
        .join(ParaulogicHint, ParaulogicHint.word_id == ParaulogicWord.id, isouter=True)
    ).all()

    hint_texts = [hint for _, hint in pairs if hint is not None]

    assert len(pairs) == EXPECTED_WORDS, (
        "Hay palabras del conjunto sin pista."
    )
    assert len(hint_texts) == EXPECTED_HINTS, (
        "Cada palabra del conjunto debería tener una pista."
    )

    # Cada palabra con un texto de pista distinto: si dos compartieran el mismo
    # texto, la una estaría con la pista de la otra.
    assert len(set(hint_texts)) == EXPECTED_HINTS, (
        "Hay palabras que comparten el texto de la pista: alguna tiene la pista de "
        "otra palabra."
    )


def test_seed_file_does_not_create_tables() -> None:
    """El esquema tiene una sola fuente de verdad: la migración de Alembic.

    Si el seed volviera a crear tablas, podría dejar el esquema en un estado que
    los modelos no reflejan, y el fallo aparecería más tarde y en otro sitio.
    """
    seed_sql = read_seed_sql()

    assert "CREATE TABLE" not in seed_sql.upper(), (
        "El seed no debe crear tablas: eso es tarea de la migración."
    )


def test_no_extra_tables_beyond_the_declared_ones(seeded_db_session) -> None:
    """Comprobación de apoyo: las tablas del esquema son las que se declaran.

    Una tabla que se cuele sin modelo es código sin requisito que lo justifique
    (§0.3, punto 5).
    """
    expected = {
        "users",
        "games",
        "paraulogic_sets",
        "paraulogic_words",
        "paraulogic_hints",
        "wordle_words",
        "riddles",
        "game_sessions",
        "paraulogic_found_words",
        "wordle_attempts",
        "riddle_answers",
        "scores",
        "auth_sessions",
        "login_attempts",
        # spec 007: el chat y los bloqueos. Solo estas dos, y está comprobado en
        # `test_no_personal_data.py` que no haya una tercera de moderación.
        "chat_messages",
        "user_blocks",
    }
    rows = seeded_db_session.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    ).scalars()
    actual = set(rows) - {"alembic_version"}

    assert actual == expected