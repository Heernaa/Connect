import { expect, test } from '@playwright/test'

import {
  PARAULOGIC,
  RIDDLE,
  WORDLE,
  auditAccessibility,
  screenUrl,
  stubApiSignedIn,
  stubGames,
} from './helpers.js'

/**
 * Las tres pantallas de juego (spec 006 · R-020, y R-002, R-005, R-010, R-014).
 *
 * Cada juego se audita en **todos sus estados**, no solo en el vacío. Y esto no
 * es celo: la pantalla vacía no tiene la rejilla de Wordle, ni el contador de
 * Paraulógic, ni el botón de pista, ni el teclado virtual. Una suite que solo
 * audita el estado inicial pasa sin haber mirado nada de lo que hay.
 *
 * Los estados que se auditan, y por qué cada uno:
 *
 * · **vacío** — lo primero que ve quien juega por primera vez.
 * · **con progreso** — quien vuelve a una partida empezada (§2.1.7). Es el estado
 *   con más elementos en pantalla y el que más最容易 se desborda a 360px.
 * · **con error** — donde aparecen `role="alert"` y `aria-invalid` (R-009).
 * · **terminado** — en Wordle desaparece el teclado y aparece el resultado. Un
 *   cambio de estado que se rompe aquí es el más difícil de ver jugando.
 */

/** Los cuatro estados que se auditan en cada juego. */
const ESTADOS = [
  {
    nombre: 'vacío',
    url: 'paraulogic',
    overrides: {},
    esperar: 'Las letras',
  },
  {
    nombre: 'con progreso guardado',
    url: 'paraulogic',
    overrides: { '/games/paraulogic/session': PARAULOGIC.sessionEnMarcha },
    esperar: 'Palabras encontradas',
  },
  {
    nombre: 'con error de validación',
    url: 'paraulogic',
    overrides: {},
    esperar: 'Las letras',
    // Se escribe una palabra con una letra que no está en el conjunto: es el
    // error más probable de todos y el que el servidor redacta (§4.1).
    antes: async (page) => {
      await page.getByRole('textbox', { name: /Escribe una palabra/ }).fill('ZZX')
      await page.getByRole('button', { name: 'Comprobar la palabra' }).click()
    },
  },
  {
    nombre: 'terminado',
    url: 'paraulogic',
    overrides: {
      '/games/paraulogic/session': {
        game_id: 'paraulogic',
        status: 'finished',
        found_words: ['LUNAS', 'TREN', 'NUBE'],
        pending_count: 0,
        score: 21,
      },
    },
    esperar: 'Las has encontrado todas',
  },

  {
    nombre: 'vacío',
    url: 'wordle',
    overrides: {},
    esperar: 'Tus intentos',
  },
  {
    nombre: 'con un intento y su rejilla',
    url: 'wordle',
    overrides: {
      '/games/wordle/session': WORDLE.sessionConIntento,
      '/games/wordle': { word: 'LUNAS', already_finished: false },
    },
    esperar: 'Tus intentos',
  },
  {
    nombre: 'con la partida ya jugada',
    url: 'wordle',
    overrides: {
      '/games/wordle/session': WORDLE.sessionTerminada,
      '/games/wordle': { word: null, already_finished: true },
    },
    esperar: 'Tu resultado',
  },

  {
    nombre: 'vacío',
    url: 'riddle',
    overrides: {},
    esperar: 'La pregunta',
  },
  {
    nombre: 'con una respuesta rechazada',
    url: 'riddle',
    overrides: { '/games/riddle/session': RIDDLE.sessionFallado },
    esperar: 'La pregunta',
    antes: async (page) => {
      await page.getByRole('textbox', { name: /Tu respuesta/ }).fill('otra cosa')
      await page.getByRole('button', { name: 'Comprobar la respuesta' }).click()
    },
  },
  {
    nombre: 'con la respuesta ya acertada',
    url: 'riddle',
    overrides: { '/games/riddle/session': RIDDLE.sessionAcierto },
    esperar: 'La pregunta',
  },
]

for (const estado of ESTADOS) {
  test(`axe-core no encuentra violaciones en ${estado.url} — estado «${estado.nombre}»`, async ({ page }) => {
    // R-020: se audita **con sesión**, porque sin ella la pantalla solo enseña el
    // aviso de «entra para jugar» y no hay juego que auditar.
    await stubApiSignedIn(page)
    await stubGames(page, estado.overrides)

    await page.goto(screenUrl({ hash: `#/game/${estado.url}` }))

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(estado.esperar, { exact: false }).first()).toBeVisible()

    if (estado.antes) await estado.antes(page)

    const violations = await auditAccessibility(page)

    const report = violations
      .map(
        (violation) =>
          `- [${violation.impact}] ${violation.id}: ${violation.help}\n` +
          `  ${violation.nodes.slice(0, 3).map((node) => `    · ${node.target.join(' ')}`).join('\n')}`,
      )
      .join('\n')

    expect(violations, `Violaciones en ${estado.url} (${estado.nombre}):\n${report}`).toHaveLength(0)
  })
}

// --- R-005 y R-014 — Cada juego se juega entero solo con teclado --------------

test('Paraulógic se juega entero solo con teclado', async ({ page }) => {
  // R-014 y R-005: se escribe la palabra, se comprueba y aparece. Con `Tab` y
  // `Enter`, sin tocar el ratón en ningún momento.
  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/paraulogic/attempt': { is_correct: true, score: 1, correct_word: 'LUNAS', found_words: 1 },
  })

  await page.goto(screenUrl({ hash: '#/game/paraulogic' }))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const campo = page.getByRole('textbox', { name: /Escribe una palabra/ })

  await campo.focus()
  await page.keyboard.type('LUNAS')
  await page.keyboard.press('Enter')

  await expect(page.getByText('LUNAS', { exact: true })).toBeVisible()
})

test('Wordle se juega entero con el teclado en pantalla', async ({ page }) => {
  // R-014: el teclado virtual es lo que permite escribir sin precisión motora
  // fina (§1.1). Se comprueba **pulsando las teclas**, no escribiendo en el
  // campo: si el teclado no funcionara, este test lo detectaría.
  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/wordle/attempt': {
      attempt_number: 1,
      guess: 'LUNAS',
      feedback: ['correct', 'correct', 'correct', 'correct', 'correct'],
      solved: true,
      score: 100,
    },
  })

  await page.goto(screenUrl({ hash: '#/game/wordle' }))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  for (const letter of ['L', 'U', 'N', 'A', 'S']) {
    await page.getByRole('button', { name: `Escribir la letra ${letter}` }).click()
  }

  await page.getByRole('button', { name: 'Comprobar el intento' }).click()

  await expect(page.getByText(/La acertaste en el intento/)).toBeVisible()
})

test('el acertijo se responde entero solo con teclado', async ({ page }) => {
  // La partida empieza **sin acertar**: con una ya acertada el formulario no
  // está, y el test se estaría midiendo otra cosa.
  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/riddle/answer': { is_correct: true, attempts_used: 1 },
    '/games/riddle/session': RIDDLE.session,
  })

  await page.goto(screenUrl({ hash: '#/game/riddle' }))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('textbox', { name: /Tu respuesta/ })).toBeVisible()

  const campo = page.getByRole('textbox', { name: /Tu respuesta/ })

  await campo.focus()
  await page.keyboard.type('el mundo')
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Has acertado/)).toBeVisible()
})

// --- R-004 — Las tres pistas de Wordle sin color -----------------------------

test('las tres pistas de Wordle se distinguen sin color', async ({ page }) => {
  // R-004 y §2.1.4: es el caso que la constitución marca como obligatorio. Con
  // `forced-colors` los fondos desaparecen y solo quedan los **glifos**, que es
  // justo lo que hay que comprobar: si las casillas se distinguen solo por el
  // color, aquí se vuelven tres casillas iguales.
  await page.emulateMedia({ forcedColors: 'active' })

  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/wordle/session': WORDLE.sessionConIntento,
    '/games/wordle': { word: 'LUNAS', already_finished: false },
  })

  await page.goto(screenUrl({ hash: '#/game/wordle' }))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const celdas = page.locator('.ui-wordle-cell[data-state]')
  const estados = await celdas.evaluateAll((nodes) => nodes.map((node) => node.dataset.state))

  expect(estados).toContain('correct')
  expect(estados).toContain('present')
  expect(estados).toContain('absent')

  // Cada estado lleva **un glifo distinto**. Es la señal que sobrevive a que el
  // color se apague.
  const glifos = await celdas.evaluateAll((nodes) =>
    nodes.map((node) => node.querySelector('.ui-wordle-cell__glyph')?.textContent),
  )

  expect(new Set(glifos).size).toBe(3)
})

test('cada casilla de Wordle dice su estado en texto', async ({ page }) => {
  // R-004: el glifo es para quien ve; el texto es para quien oye. Sin lo segundo,
  // un lector de pantalla anunciaría «✓» y no diría nada útil.
  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/wordle/session': WORDLE.sessionConIntento,
    '/games/wordle': { word: 'LUNAS', already_finished: false },
  })

  await page.goto(screenUrl({ hash: '#/game/wordle' }))
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await expect(page.getByText('No está en la palabra').first()).toBeAttached()
  await expect(page.getByText('Está en la palabra, en otro orden').first()).toBeAttached()
})

test('la leyenda de Wordle explica los tres estados antes de la rejilla', async ({ page }) => {
  // Un glifo sin explicación obliga a adivinarlo una vez por casilla. La leyenda
  // va **antes** de la rejilla para que se aprenda una sola vez.
  await stubApiSignedIn(page)
  await stubGames(page, {
    '/games/wordle/session': WORDLE.sessionConIntento,
    '/games/wordle': { word: 'LUNAS', already_finished: false },
  })

  await page.goto(screenUrl({ hash: '#/game/wordle' }))
  await expect(page.getByText('En su sitio').first()).toBeVisible()

  const orden = await page.evaluate(() => {
    const leyenda = document.querySelector('.ui-legend')
    const rejilla = document.querySelector('.ui-attempts') ?? document.querySelector('.ui-card')

    return leyenda.compareDocumentPosition(rejilla) & Node.DOCUMENT_POSITION_FOLLOWING ? 1 : 0
  })

  expect(orden).toBe(1)
})

// --- R-010 — Reflow ----------------------------------------------------------

for (const [nombre, url, esperar] of [
  ['Paraulógic', 'paraulogic', 'Las letras'],
  ['Wordle', 'wordle', 'Tus intentos'],
  ['Acertijo', 'riddle', 'La pregunta'],
]) {
  test(`${nombre} no tiene scroll horizontal en móvil de 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 })

    await stubApiSignedIn(page)
    await stubGames(page)

    await page.goto(screenUrl({ hash: `#/game/${url}` }))
    await expect(page.getByText(esperar, { exact: false }).first()).toBeVisible()

    const desbordamiento = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect(desbordamiento).toBeLessThanOrEqual(0)
  })

  test(`${nombre} aguanta el 200% de tamaño de texto`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 })

    await stubApiSignedIn(page)
    await stubGames(page)

    await page.goto(screenUrl({ hash: `#/game/${url}` }))
    await expect(page.getByText(esperar, { exact: false }).first()).toBeVisible()

    // Se sube el texto con el control real de la aplicación, no con un `style`
    // inyectado: lo que se mide es lo que vería quien pulsa el botón (§4.1).
    await page.getByRole('button', { name: 'Agrandar el texto' }).click()
    await page.getByRole('button', { name: 'Agrandar el texto' }).click()

    const desbordamiento = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )

    expect(desbordamiento).toBeLessThanOrEqual(0)
  })
}