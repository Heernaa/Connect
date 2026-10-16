"""Cálculo de la puntuación (§2.1.5, R-005 a R-008).

**La fórmula vive aquí y en ningún otro sitio.** Si un número aparece repetido en
dos ficheros, la puntuación deja de tener una sola fuente y cualquier cambio
empieza a dar resultados que nadie sabe explicar.

Principio que atraviesa el módulo (§1.6, §2.1.5): **se premia haber acertado,
nunca la rapidez.** Solo Wordle, que se juega una única vez, tiene componente de
eficiencia.
"""

from dataclasses import dataclass

#: Paraulógic: 1 punto por palabra encontrada. Nada más (R-006).
PARAULOGIC_POINTS_PER_WORD = 1

#: Wordle: base de 100 puntos, menos un 10 % de la base por cada intento usado
#: (R-007). Acierto al primer intento = 100; al sexto = 50.
WORDLE_BASE_POINTS = 100
WORDLE_PENALTY_PER_ATTEMPT = 0.10

#: Acertijo: 10 puntos fijos al acertar (R-008). Ni los intentos fallidos ni el
#: tiempo quitan nada: quien piensa y luego acierta cobra lo mismo (§2.1.4).
RIDDLE_POINTS = 10


@dataclass(frozen=True)
class ScoreBreakdown:
    """Puntuación calculada, con la explicación de cómo se ha llegado.

    Los motivos se devuelven para que se puedan registrar o mostrar. No son
    decorations: sin ellos no hay forma de saber por qué una cifra es la que es.
    """

    points: int
    explanation: tuple[str, ...]


def score_paraulogic(found_word_count: int) -> ScoreBreakdown:
    """Puntuación de Paraulógic: 1 punto por palabra encontrada (R-006).

    Ni las pistas ni los intentos fallidos restan nada (§2.1.5). Se calcula a
    partir del **número de palabras que existen en el conjunto**, nunca de lo que
    diga el cliente (§6.6).
    """
    if found_word_count < 0:
        raise ValueError("El número de palabras encontradas no puede ser negativo.")

    return ScoreBreakdown(
        points=found_word_count * PARAULOGIC_POINTS_PER_WORD,
        explanation=(
            f"{found_word_count} palabras encontradas "
            f"× {PARAULOGIC_POINTS_PER_WORD} punto",
            "Pedir pistas no resta puntos.",
            "Los intentos fallidos no restan puntos.",
        ),
    )


def score_wordle(attempts_used: int) -> ScoreBreakdown:
    """Puntuación de Wordle: base 100 menos un 10 % por intento (R-007).

    `attempts_used` es el número de intentos **hasta el acierto, incluido**. El
    acierto al primer intento vale la base entera: la penalización empieza a
    contar **a partir del segundo**. Así queda exactamente lo que fija la
    constitución (§2.1.5): acierto al intento 1 = 100, al intento 6 = 50.

    El suelo son 50 puntos, no 0. Quien llega la partida hasta el último intento no
    puede quedarse sin nada: ha estado pensando, y eso también vale (§1.1).
    """
    if attempts_used < 1:
        raise ValueError("Hace falta al menos un intento para puntuar.")

    extra_attempts = attempts_used - 1
    penalty_fraction = min(WORDLE_PENALTY_PER_ATTEMPT * extra_attempts, 1.0)
    points = round(WORDLE_BASE_POINTS * (1 - penalty_fraction))

    if extra_attempts == 0:
        detail = f"{WORDLE_BASE_POINTS} puntos: acertaste al primer intento"
    else:
        detail = (
            f"{WORDLE_BASE_POINTS} puntos de base, menos un "
            f"{int(WORDLE_PENALTY_PER_ATTEMPT * 100)} % por cada uno de los "
            f"{extra_attempts} intentos de más: {points} puntos"
        )

    return ScoreBreakdown(points=points, explanation=(detail,))


def score_riddle(is_correct: bool) -> ScoreBreakdown:
    """Puntuación del acertijo: 10 puntos fijos si se acierta (R-008).

    Fallar no quita puntos: no hay penalización por intentos ni por tiempo. El
    objetivo del ejercicio es pensar, no acertar a la primera (§2.1.4).
    """
    if is_correct:
        return ScoreBreakdown(
            points=RIDDLE_POINTS, explanation=("Respuesta correcta.",)
        )

    return ScoreBreakdown(
        points=0, explanation=("Todavía no. Los intentos no restan puntos.",)
    )