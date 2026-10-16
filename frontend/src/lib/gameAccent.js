/**
 * Acentos de tarjeta (R-004).
 *
 * Un acento por juego, **asignado por identificador y no por posición**. Si se
 * asignara por posición en la lista, reordenar la API cambiaría el color de un
 * juego sin que nadie lo hubiera decidido, y dos tarjetas del mismo juego
 * acabarían con colores distintos.
 *
 * El color es **decorativo**: no dice si el juego está jugado, ni si es fácil o
 * difícil, ni nada que haya que leer. Por eso no lleva etiqueta ni leyenda, y por
 * eso un juego nuevo que no esté en la lista cae en el primero sin romperse.
 *
 * Los tres tonos dan 5.02:1, 5.99:1 y 7.10:1 con el glifo blanco encima
 * (R-003). Son el verde y el teal de Figma, profundizados.
 */
const ACCENTS = {
  paraulogic: 'var(--color-accent-1)',
  wordle: 'var(--color-accent-2)',
  acertijo: 'var(--color-accent-3)',
}

const DEFAULT_ACCENT = 'var(--color-accent-1)'

/** El color de acento de un juego, por su identificador. */
export function accentFor(gameId) {
  return ACCENTS[gameId] ?? DEFAULT_ACCENT
}
