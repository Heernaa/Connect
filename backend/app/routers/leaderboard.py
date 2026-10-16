"""La clasificación (R-001, R-002, §2.4).

Se consulta **sin iniciar sesión**: el modo espectador es una decisión de
producto, no un descuido. Quien no tiene cuenta todavía puede ver que hay otras
personas jugando, y esa es la razón principal por la que se crea una.

Tres cosas que este archivo hace a propósito:

- **Nunca devuelve el `username`** (R-001). No es que se compruebe y se quite:
  el esquema de respuesta no declara ese campo, así que no existe la forma de
  devolverlo por descuido (§6.5).
- **La puntuación sale de la tabla `scores`, no se calcula en el proceso**
  (§2.4). La total es un `SUM` en PostgreSQL. Calcularla en Python obligaría a
  traerse todas las filas, que es justo lo que la paginación evita.
- **El orden es determinista** (R-002). Puntos descendentes y, a igualdad,
  alias ascendente. Sin el segundo criterio, dos filas con la misma puntuación
  pueden salir en cualquier orden y la paginación empezaría a repetir y saltar
  filas entre páginas.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.dependencies import get_db
from app.models.session import Score
from app.models.user import User
from app.schemas.social import (
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    LeaderboardEntry,
    LeaderboardResponse,
)

router = APIRouter(tags=["leaderboard"])


def _base_query() -> Select:
    """Alias y puntos, sin el identificador de usuario.

    **Join interior, no exterior.** Quien ha creado una cuenta y no ha jugado
    todavía **no aparece**: una fila con cero puntos al final de la lista no le
    dice nada a quien la mira y hace que la clasificación parezca más larga de
    lo que es. Con un `LEFT JOIN` la lista empezaría por quien más ha jugado y
    acabaría en gente que no ha abierto un juego, que es justo el final que nadie
    lee.

    No se trae `users.id`: no se usa para nada de lo que sale, y no hace falta
    que pase por el servidor ni un momento.

    El orden se aplica aquí una sola vez, para que las dos vistas no puedan
    ordenarse de forma distinta.
    """
    return (
        select(User.alias, func.sum(Score.points).label("points"))
        .join(Score, Score.user_id == User.id)
        .group_by(User.id, User.alias)
        .order_by(func.sum(Score.points).desc(), User.alias.asc())
    )


@router.get(
    "/leaderboard",
    response_model=LeaderboardResponse,
    summary="La clasificación, sin necesidad de iniciar sesión",
)
def leaderboard(
    game_id: str | None = Query(default=None, description="Filtra por un solo juego"),
    limit: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> LeaderboardResponse:
    """Clasificación global acumulada, o de un juego (R-001).

    El total no se guarda en ninguna tabla: se suma al consultar. Si estuviera
    guardado, algún día se desincronizaría de la suma por juego y habría dos
    verdades distintas (spec 005 · R-003).
    """
    query = _base_query()

    if game_id is not None:
        query = query.where(Score.game_id == game_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = db.scalar(count_query) or 0

    rows = db.execute(query.limit(limit).offset(offset)).all()

    return LeaderboardResponse(
        entries=[
            LeaderboardEntry(
                alias=row.alias,
                points=int(row.points),
                # `None` en la vista global: esos puntos son la suma de todos
                # los juegos, y no corresponde a ninguno en concreto.
                game_id=game_id,
            )
            for row in rows
        ],
        total=total,
        has_more=offset + len(rows) < total,
    )