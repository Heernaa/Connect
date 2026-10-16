// @vitest-environment node
//
// Este test no necesita DOM: solo lee un archivo. Se declara entorno `node`
// porque `import.meta.url` solo es una ruta de archivo en ese entorno; bajo
// `jsdom` es una URL `http:` y `fileURLToPath` falla.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  BORDER_PAIRS,
  DECORATIVE_ONLY,
  GAME_BORDER_PAIRS,
  GAME_PAIRS,
  HALO_PAIRS,
  LARGE_OR_BORDER_CONTRAST,
  TEXT_CONTRAST,
  TEXT_PAIRS,
} from './contrastPairs.js'

/**
 * Verificación automática del contraste (R-003, tarea 6.5 del plan).
 *
 * La constitución lo pide de forma expresa: el contraste **se mide**, no se
 * estima a ojo (§4.2). Este test lee los valores reales de `index.css` — la
 * única fuente de la paleta — y falla si algún par baja del umbral de WCAG.
 *
 * Por qué lee el CSS y no importa un módulo de tokens: los valores los usa
 * Tailwind desde `@theme`, así que el CSS es la fuente de verdad. Importar una
 * copia en JavaScript daría dos paletas que se pueden desincronizar en
 * silencio, y el test auditando una paleta que nadie ve.
 */

const CSS_PATH = fileURLToPath(new URL('../index.css', import.meta.url))

/** Lee el valor hexadecimal de un token `--color-*` del bloque `@theme`. */
function readColorToken(tokenName) {
  const css = readFileSync(CSS_PATH, 'utf8')
  const pattern = new RegExp(`--color-${tokenName}:\\s*(#[0-9a-fA-F]{3,8})\\b`)

  const match = css.match(pattern)

  if (!match) {
    throw new Error(
      `El token --color-${tokenName} no existe en index.css. Si se ha renombrado, ` +
        'hay que actualizar también la tabla de src/design/contrastPairs.js.',
    )
  }

  return match[1]
}

/** Componente lineal de un canal de 8 bits, según WCAG 2.x. */
function linearizeChannel(value8bit) {
  const channel = value8bit / 255

  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** Luminancia relativa de un color hexadecimal (`#rgb` o `#rrggbb`). */
function relativeLuminance(hex) {
  const digits = hex.replace('#', '')

  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : digits

  const channels = [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16))

  const [red, green, blue] = channels.map(linearizeChannel)

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** Razón de contraste entre dos colores, de 1 a 21. */
function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )

  return (values[0] + 0.05) / (values[1] + 0.05)
}

/** Redondea a dos decimales: más de eso es ruido de coma flotante. */
function ratio(foreground, background) {
  return Math.round(contrastRatio(foreground, background) * 100) / 100
}

/** Comprueba una lista de pares contra un umbral. */
function checkPairs(pairs, minimum) {
  return pairs.map(([foregroundToken, backgroundToken, reason]) => ({
    label: `${foregroundToken} sobre ${backgroundToken}`,
    reason,
    measured: ratio(readColorToken(foregroundToken), readColorToken(backgroundToken)),
    minimum,
  }))
}

describe('contraste de la paleta (R-003)', () => {
  const textResults = checkPairs(TEXT_PAIRS, TEXT_CONTRAST)
  const borderResults = checkPairs(BORDER_PAIRS, LARGE_OR_BORDER_CONTRAST)
  const haloResults = checkPairs(HALO_PAIRS, LARGE_OR_BORDER_CONTRAST)

  // Los juegos (spec 006 · R-016). En un juego el color **es** información, así
  // que se comprueban con el mismo umbral que el resto del texto: 4.5:1. Un
  // estado que solo llegue a 3:1 se leería bien con el texto grande de una
  // casilla y mal con el de otra, y quien pierde es quien lee más pequeño.
  const gameResults = checkPairs(GAME_PAIRS, TEXT_CONTRAST)
  const gameBorderResults = checkPairs(GAME_BORDER_PAIRS, LARGE_OR_BORDER_CONTRAST)

  it.each(textResults)(
    'texto normal: $label da $measured:1 y necesita $minimum:1',
    ({ measured, minimum }) => {
      expect(measured).toBeGreaterThanOrEqual(minimum)
    },
  )

  it.each(borderResults)(
    'borde o foco: $label da $measured:1 y necesita $minimum:1',
    ({ measured, minimum }) => {
      expect(measured).toBeGreaterThanOrEqual(minimum)
    },
  )

  it.each(haloResults)(
    'halo del foco: $label da $measured:1 y necesita $minimum:1',
    ({ measured, minimum }) => {
      expect(measured).toBeGreaterThanOrEqual(minimum)
    },
  )

  it.each(gameResults)(
    'los juegos: $label da $measured:1 y necesita $minimum:1',
    ({ measured, minimum }) => {
      expect(measured).toBeGreaterThanOrEqual(minimum)
    },
  )

  it.each(gameBorderResults)(
    'los juegos, borde: $label da $measured:1 y necesita $minimum:1',
    ({ measured, minimum }) => {
      expect(measured).toBeGreaterThanOrEqual(minimum)
    },
  )

  it('ningún par queda por debajo de su umbral', () => {
    const failures = [
      ...textResults,
      ...borderResults,
      ...haloResults,
      ...gameResults,
      ...gameBorderResults,
    ].filter(
      ({ measured, minimum }) => measured < minimum,
    )

    // El mensaje nombra el par y el motivo para que el fallo diga qué arreglar,
    // y no solo qué número es pequeño.
    const report = failures
      .map(({ label, reason, measured, minimum }) => `- ${label}: ${measured}:1 (necesita ${minimum}:1). ${reason}`)
      .join('\n')

    expect(failures, `Contraste insuficiente:\n${report}`).toHaveLength(0)
  })

  it('ningún par de la tabla repite el mismo token dos veces', () => {
    const broken = [...TEXT_PAIRS, ...BORDER_PAIRS, ...HALO_PAIRS, ...GAME_PAIRS].filter(
      ([foreground, background]) => foreground === background,
    )

    expect(broken).toHaveLength(0)
  })

  it('todo color excluido está escrito y es solo decorativo', () => {
    // Los tokens excluidos se declaran en `index.css`. Si alguno desaparece de
    // la paleta, la excepción se queda apuntando al vacío y hay que borrarla.
    for (const token of Object.keys(DECORATIVE_ONLY)) {
      expect(() => readColorToken(token), `El token excluido ${token} ya no existe`).not.toThrow()
    }

    for (const [_token, reason] of Object.entries(DECORATIVE_ONLY)) {
      expect(reason.length).toBeGreaterThan(20)
    }
  })
})
