import {
  apiJson,
  createAccount,
  deleteAccount,
  expect,
  field,
  letterNotIn,
  test,
} from './helpers.js'

/**
 * Wordle contra el backend real (spec 008 · R-002).
 *
 * Lo que se comprueba: que se pueden **hacer intentos**, que las **tres pistas**
 * se ven después de cada uno, que lo que dice cada casilla es lo que calculó el
 * servidor y que la partida **solo se puede jugar una vez** (§2.1.4).
 */

/** La cuenta que crea el recorrido se borra: la base es la de desarrollo. */
test.afterEach(async ({ context }) => {
  await deleteAccount(context)
})

test('tres intentos, las tres pistas y una sola partida por cuenta', async ({ page, context }) => {
  await createAccount(context)

  await page.goto('/#/game/wordle')
  await expect(page.getByRole('heading', { name: 'Tus intentos' })).toBeVisible()

  // La palabra objetivo solo se sirve mientras la partida está abierta (§2.1.2),
  // y para este recorrido interesa: lo que hay que adivinar es el contenido que
  // hay ahora mismo en la base de datos, no una palabra escrita en el test.
  const { word } = await apiJson(context.request, '/api/games/wordle')

  await test.step('Las tres pistas están escritas, no solo dibujadas', async () => {
    // Sin esto, quien no distingue colores no tiene con qué jugar: un color y un
    // icono no bastan (§2.1.4, R-004).
    await expect(page.getByText('En su sitio')).toBeVisible()
    await expect(page.getByText('Está en la palabra, en otro orden')).toBeVisible()
    await expect(page.getByText('No está en la palabra')).toBeVisible()
  })

  await test.step('Un intento con letras cambiadas de sitio se ve como lo calculó el servidor', async () => {
    // Se escribe con el **teclado en pantalla**, que es como se juega en un
    // móvil sin teclado físico (§1.1).
    await typeWithOnScreenKeyboard(page, lettersOutOfPlace(word))
    await page.getByRole('button', { name: 'Comprobar el intento' }).click()

    await expect(attemptsCounter(page)).toHaveText('Intentos usados: 1 de 6')

    const row = attemptRow(page, 0)

    await expect(row).toContainText('Está en la palabra, en otro orden')
    await expectFeedbackToMatchServer(row, context, 0)
  })

  await test.step('Un intento con una letra que no está en la palabra también', async () => {
    await field(page, 'Escribe tu intento').fill(letterNotIn(word) + word.slice(1))
    await page.getByRole('button', { name: 'Comprobar el intento' }).click()

    await expect(attemptsCounter(page)).toHaveText('Intentos usados: 2 de 6')

    const row = attemptRow(page, 1)

    await expect(row).toContainText('No está en la palabra')
    await expect(row).toContainText('En su sitio')
    await expectFeedbackToMatchServer(row, context, 1)
  })

  await test.step('La palabra correcta resuelve la partida y puntúa según los intentos', async () => {
    await field(page, 'Escribe tu intento').fill(word)
    await page.getByRole('button', { name: 'Comprobar el intento' }).click()

    await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible()
    await expect(page.getByText('La acertaste en el intento 3.')).toBeVisible()

    // Base 100 menos un 10 % por intento a partir del segundo (§2.1.5).
    await expect(page.getByText('Tus puntos: 80 puntos')).toBeVisible()
  })

  await test.step('La partida no se puede volver a jugar', async () => {
    // Recargar tampoco devuelve el formulario: la partida se acabó para esta
    // cuenta, no solo para esta sesión del navegador.
    await page.reload()

    await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible()
    await expect(field(page, 'Escribe tu intento')).toHaveCount(0)

    // Y el servidor, que es quien manda, rechaza el intento aunque alguien
    // fabricara la petición (§6.6).
    const rejected = await context.request.post('/api/games/wordle/attempt', {
      data: { guess: word },
    })

    expect(rejected.status()).toBe(409)
    expect((await rejected.json()).message).toBe(
      'Ya has jugado tu partida de Wordle. Puedes ver el resultado.',
    )

    const games = await apiJson(context.request, '/api/games')
    const wordle = games.find((game) => game.game_id === 'wordle')

    expect(wordle.played).toBe(true)
    expect(wordle.score).toBe(80)
  })
})

/**
 * El contador de intentos.
 *
 * Se busca dentro de la sección de la rejilla porque cada fila lleva **su propio**
 * «Intentos usados: N de 6» en texto para el lector de pantalla (para que se sepa
 * cuál es cuál al leerlos seguidos). Buscarlo en toda la página daría dos
 * coincidencias, y el recorrido no puede comprobar «cuál de las dos».
 */
function attemptsCounter(page) {
  // El contador es el único `aria-live` de la sección: las filas llevan el suyo
  // propio, pero en un `sr-only` dentro del `li`, no en un párrafo vivo.
  return page
    .getByRole('heading', { name: 'Tus intentos' })
    .locator('..')
    .locator('p[aria-live="polite"]')
}

/**
 * Una fila de intentos.
 *
 * Una fila de Wordle no tiene un rol propio que la identifique —no es una tabla
 * ni una lista de opciones—, así que se localiza por la clase que le pone el
 * sistema de diseño. Lo que se comprueba después es el **texto** de la casilla,
 * que es lo que oye y lee quien usa la pantalla, y no la clase.
 */
function attemptRow(page, index) {
  return page.locator('.ui-attempt').nth(index)
}

/**
 * Que lo que ve la pantalla sea lo que calculó el servidor (§6.6).
 *
 * Si el cliente se olvidara de pintar una pista, o la pintara con el estado
 * equivocado, esta es la comprobación que lo detecta: el `feedback` que devuelve
 * la API, casilla a casilla.
 */
async function expectFeedbackToMatchServer(row, context, index) {
  const { attempts } = await apiJson(context.request, '/api/games/wordle/session')

  const states = await row
    .locator('.ui-wordle-cell')
    .evaluateAll((cells) => cells.map((cell) => cell.dataset.state))

  expect(states, `el intento ${index + 1} no se ve como lo calculó el servidor`).toEqual(
    attempts[index].feedback,
  )
}

/** Escribe el intento letra a letra con el teclado en pantalla de la pantalla. */
async function typeWithOnScreenKeyboard(page, guess) {
  for (const letter of guess) {
    await page.getByRole('button', { name: `Escribir la letra ${letter}` }).click()
  }
}

/**
 * Un intento con letras de la palabra **en otro sitio**, para ver la pista
 * «está en la palabra, en otro orden».
 *
 * Se intercambian las dos primeras letras. Si fueran iguales no habría nada que
 * intercambiar, y entonces se desplaza la palabra un sitio, que produce la misma
 * pista. El caso no se da con el contenido del MVP, pero el recorrido no debería
 * romperse por un cambio de contenido que no tiene nada que ver con lo que
 * comprueba.
 */
function lettersOutOfPlace(word) {
  if (word[0] === word[1]) return word.slice(1) + word[0]

  return word[1] + word[0] + word.slice(2)
}