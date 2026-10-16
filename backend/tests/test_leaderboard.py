"""La clasificación (spec 007 · R-001, R-002, §2.4).

Los tests importantes son los de **qué no sale**. Se escriben como comprobación
literal sobre el cuerpo entero de la respuesta, no mirando campos concretos: así
siguen siendo válidos si mañana el formato cambia, que es lo que no consigue un
test atado a la estructura.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.enums import GameId
from app.models.session import Score
from app.models.user import User

VALID_PASSWORD = "una contraseña fácil"

pytestmark = pytest.mark.integration


def _make_user(db: Session, username: str, alias: str) -> User:
    user = User(
        username=username,
        username_normalized=username.casefold(),
        password_hash="no-se-usa",
        alias=alias,
    )
    db.add(user)
    db.commit()

    return user


def _score(db: Session, user: User, game_id: GameId, points: int) -> None:
    db.add(Score(user_id=user.id, game_id=game_id, points=points))
    db.commit()


@pytest.fixture
def players(db_session: Session) -> list[User]:
    """Tres cuentas con alias y puntuaciones que no empatan.

    Los alias van en orden inverso a los puntos a propósito: si la ordenación
    usara el alias por defecto en vez del pedido, el test lo vería.
    """
    carmen = _make_user(db_session, "carmen", "ZorroTranquilo")
    antonio = _make_user(db_session, "antonio", "ArdillaViva")
    luisa = _make_user(db_session, "luisa", "MariposaSuave")

    _score(db_session, antonio, GameId.WORDLE, 100)
    _score(db_session, carmen, GameId.WORDLE, 50)
    _score(db_session, luisa, GameId.WORDLE, 50)

    return [carmen, antonio, luisa]


# --- R-001: visible sin cuenta ------------------------------------------------


def test_leaderboard_works_without_a_session(client: TestClient, players) -> None:
    """V.1: se consulta sin iniciar sesión (modo espectador, §2.4)."""
    response = client.get("/api/leaderboard")

    assert response.status_code == 200
    assert len(response.json()["entries"]) == 3


def test_leaderboard_never_returns_the_username(client: TestClient, players) -> None:
    """R-001 y V.2: el `username` no sale, ni escrito en ningún campo.

    No se mira «que no haya una clave `username`»: se busca el nombre en la
    respuesta entera, para que tampoco aparezca por dentro de otro valor.
    """
    body = client.get("/api/leaderboard").text

    for user in players:
        assert user.username not in body
        assert user.username_normalized not in body


def test_leaderboard_shows_only_alias_points_and_game(client: TestClient, players) -> None:
    """V.3: alias, puntuación y juego. Nada más (§6.5)."""
    entry = client.get("/api/leaderboard").json()["entries"][0]

    assert sorted(entry) == ["alias", "game_id", "points"]


def test_leaderboard_uses_the_anonymous_alias(client: TestClient, players) -> None:
    """R-005: lo que sale es el alias, no el nombre de usuario."""
    aliases = {entry["alias"] for entry in client.get("/api/leaderboard").json()["entries"]}

    assert aliases == {user.alias for user in players}


# --- R-002: ordenación y paginación -------------------------------------------


def test_leaderboard_orders_by_points_descending(client: TestClient, players) -> None:
    """R-002: primero quien más puntos tiene."""
    points = [entry["points"] for entry in client.get("/api/leaderboard").json()["entries"]]

    assert points == [100, 50, 50]


def test_leaderboard_breaks_ties_by_alias(
    client: TestClient, players: list[User]
) -> None:
    """R-002: a igualdad de puntos, el alias decide, y siempre igual.

    Dos de los tres tienen 50 puntos. Si el desempate fuera por identificador o
    por orden de inserción, el resultado sería estable pero distinto del que pide
    el requisito.
    """
    entries = client.get("/api/leaderboard").json()["entries"]
    tied = [entry["alias"] for entry in entries if entry["points"] == 50]

    assert tied == ["MariposaSuave", "ZorroTranquilo"]


def test_leaderboard_total_is_the_sum_of_every_game(
    client: TestClient, db_session: Session, players: list[User]
) -> None:
    """R-001: la clasificación global suma los tres juegos."""
    carmen = players[0]
    _score(db_session, carmen, GameId.RIDDLE, 10)
    _score(db_session, carmen, GameId.PARAULOGIC, 21)

    entries = {entry["alias"]: entry for entry in client.get("/api/leaderboard").json()["entries"]}

    assert entries[carmen.alias]["points"] == 81


def test_leaderboard_global_view_has_no_specific_game(client: TestClient, players) -> None:
    """R-001: en la vista global esos puntos no son de un juego concreto.

    No es un detalle: si la interfaz tuviera que poner algo en la columna del
    juego, tendría que inventarse un nombre, y lo acabaría escribiendo a mano en
    el cliente (§2.1.2).
    """
    entries = client.get("/api/leaderboard").json()["entries"]

    assert all(entry["game_id"] is None for entry in entries)


def test_leaderboard_can_be_filtered_by_game(
    client: TestClient, db_session: Session, players: list[User]
) -> None:
    """R-001: clasificación por juego."""
    carmen = players[0]
    _score(db_session, carmen, GameId.RIDDLE, 10)

    entries = client.get("/api/leaderboard", params={"game_id": "riddle"}).json()["entries"]

    assert [(entry["alias"], entry["points"], entry["game_id"]) for entry in entries] == [
        (carmen.alias, 10, "riddle")
    ]


def test_leaderboard_paginates(client: TestClient, players) -> None:
    """R-002: no se devuelven miles de filas de una vez."""
    first = client.get("/api/leaderboard", params={"limit": 2}).json()

    assert len(first["entries"]) == 2
    assert first["total"] == 3
    assert first["has_more"] is True


def test_leaderboard_pages_do_not_repeat_rows(client: TestClient, players) -> None:
    """R-002: la segunda página sigue a la primera.

    Con el orden estable de R-002 esto no puede pasar. Sin el desempate por alias,
    dos filas con la misma puntuación podrían repetirse o saltarse entre páginas,
    y aquí se vería.
    """
    first = client.get("/api/leaderboard", params={"limit": 2}).json()["entries"]
    second = client.get("/api/leaderboard", params={"limit": 2, "offset": 2}).json()["entries"]

    assert len({entry["alias"] for entry in first} & {entry["alias"] for entry in second}) == 0


def test_leaderboard_rejects_a_page_size_that_is_too_large(client: TestClient, players) -> None:
    """R-002: el tope lo pone el servidor, no el cliente.

    Si el límite fuera responsabilidad del cliente, bastaría con no pedirlo.
    """
    response = client.get("/api/leaderboard", params={"limit": 100000})

    assert response.status_code == 422


def test_leaderboard_is_empty_without_players(client: TestClient, db_session: Session) -> None:
    """Una clasificación sin nadie con puntos no da error: da una lista vacía."""
    body = client.get("/api/leaderboard").json()

    assert body == {"entries": [], "total": 0, "has_more": False}


def test_a_player_who_has_not_played_does_not_appear(
    client: TestClient, db_session: Session
) -> None:
    """R-001: una cuenta recién creada no llena la clasificación de ceros.

    Quien se registra y todavía no juega no tiene nada que ver en una lista de
    puntuaciones. Con cero puntos al final solo se alarga una tabla que nadie
    lee hasta el final, y hace parecer que hay más gente jugando de la que hay.
    """
    _make_user(db_session, "nuevo", "LagartoNuevo")

    body = client.get("/api/leaderboard").json()

    assert "LagartoNuevo" not in client.get("/api/leaderboard").text
    assert body["total"] == 0