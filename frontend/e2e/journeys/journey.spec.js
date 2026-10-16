import { formatPoints } from '../../src/i18n/socialFormat.js'

import {
  TEST_PASSWORD,
  apiJson,
  deleteAccount,
  expect,
  field,
  sampleParaulogicWord,
  seedContent,
  test,
  uniqueUsername,
} from './helpers.js'

/**
 * El recorrido completo: registro → entrar → jugar a los tres juegos → ver la
 * puntuación en la clasificación (spec 008 · R-001, V.1 y V.3).
 *
 * **Un solo test, y no tres.** Lo que se quiere comprobar es que el camino
 * entero funciona *encadenado*: que la cuenta que se crea sigue dentro cuando se
 * sale y se vuelve a entrar, que la partida de Wordle no se pierde por haber
 * jugado antes a los otros dos juegos y que la puntuación que suma lo que ha
 * jugado es la misma que enseña la clasificación. Partido en tres tests, cada
 * comprobación seguiría valiendo y el recorrido real no se habría probado nunca.
 */

/** La cuenta que crea el recorrido se borra: la base es la de desarrollo. */
test.afterEach(async ({ context }) => {
  await deleteAccount(context)
})

test('de la cuenta nueva a la clasificación, jugando a los tres juegos', async ({
  page,
  context,
}) => {
  const username = uniqueUsername('viaje')
  let alias = ''

  await test.step('Crear la cuenta desde el formulario', async () => {
    await page.goto('/#/register')

    await field(page, 'Nombre de usuario').fill(username)
    await field(page, 'Contraseña').fill(TEST_PASSWORD)
    await field(page, 'Repite la contraseña').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Crear mi cuenta' }).click()

    await expect(page.getByRole('link', { name: 'Ir a los juegos' })).toBeVisible()

    // El registro **deja dentro** (spec 003 · R-003), así que el titular ya dice
    // el alias. Antes de la spec 008 el registro no mandaba la cookie y esta
    // pantalla era una mentira: todo lo que venía después devolvía «No has
    // iniciado sesión» con un «Volver a intentarlo» que no funcionaba (§2.1.6).
    alias = await aliasInHeader(page)
    await expect(page.getByText(`te verán los demás: ${alias}.`)).toBeVisible()
  })

  await test.step('Salir de la cuenta y volver a entrar con el nombre y la contraseña', async () => {
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()

    // El menú no lleva el acceso: quien no tiene sesión se ve en la portada, que
    // es donde está el «Entrar» (R-011). El titular desaparece, que es la señal
    // de que la sesión se cerró de verdad.
    await expect(page.getByText(/Estás dentro como/)).toHaveCount(0)

    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', {
      name: 'Portada',
    }).click()
    await page.getByRole('link', { name: 'Entrar' }).click()
    await field(page, 'Nombre de usuario').fill(username)
    await field(page, 'Contraseña').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Entrar' }).click()

    // El alias es el mismo que antes de salir: es el de la cuenta, no el de la
    // sesión, y por eso no se ve nunca el nombre de usuario (§2.2, §6.5).
    await expect(page.getByText(`Estás dentro como ${alias}.`)).toBeVisible()
  })

  await test.step('Jugar a Paraulógic desde la lista de juegos', async () => {
    await page.goto('/#/games')

    const card = page.locator('li', {
      has: page.getByRole('heading', { name: 'Paraulógic' }),
    })

    await card.getByRole('link', { name: 'Jugar' }).click()

    const word = sampleParaulogicWord()

    await field(page, 'Escribe una palabra').fill(word)
    await page.getByRole('button', { name: 'Comprobar la palabra' }).click()

    await expect(page.getByText(`¡Muy bien! Has encontrado ${word}.`)).toBeVisible()
    await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()
  })

  await test.step('Acertar el acertijo', async () => {
    await page.goto('/#/game/riddle')

    await field(page, 'Tu respuesta').fill(seedContent().riddleAnswer)
    await page.getByRole('button', { name: 'Comprobar la respuesta' }).click()

    await expect(page.getByText('¡Correcto! Has acertado y sumas 10 puntos.')).toBeVisible()
    await expect(page.getByText('Tus puntos: 10 puntos')).toBeVisible()
  })

  await test.step('Acertar Wordle al primer intento', async () => {
    await page.goto('/#/game/wordle')

    await expect(page.getByRole('heading', { name: 'Tus intentos' })).toBeVisible()

    // La palabra objetivo solo existe en el servidor mientras la partida está
    // abierta (§2.1.2). Se pide por la API, que es donde está la verdad: si el
    // recorrido coping la palabra de algún sitio, dejaría de comprobar nada.
    const { word } = await apiJson(context.request, '/api/games/wordle')

    await field(page, 'Escribe tu intento').fill(word)
    await page.getByRole('button', { name: 'Comprobar el intento' }).click()

    await expect(page.getByRole('heading', { name: 'Tu resultado' })).toBeVisible()
    await expect(page.getByText('La acertaste en el intento 1.')).toBeVisible()
    await expect(page.getByText('Tus puntos: 100 puntos')).toBeVisible()
  })

  await test.step('Ver la puntuación de verdad en la clasificación', async () => {
    // Lo que ha calculado el servidor para esta cuenta, juego por juego.
    const games = await apiJson(context.request, '/api/games')
    const total = games
      .filter((game) => game.played)
      .reduce((sum, game) => sum + game.score, 0)

    const board = await apiJson(context.request, '/api/leaderboard')
    const entry = board.entries.find((candidate) => candidate.alias === alias)

    expect(entry, `«${alias}» no sale en la clasificación`).toBeDefined()
    expect(entry.points).toBe(total)

    // En pantalla, con el filtro puesto en un juego: son menos filas y así el
    // recorrido no depende de cuántas personas hayan jugado en la base de datos
    // de desarrollo. Los puntos de la fila tienen que ser los del servidor.
    await page.goto('/#/leaderboard')
    await page.getByRole('radio', { name: 'Acertijo' }).check()

    const row = page.getByRole('row').filter({
      has: page.getByRole('cell', { name: alias, exact: true }),
    })

    await expect(row).toContainText(formatPoints(10))
  })
})

/**
 * El alias que dice el titular: «Estás dentro como {alias}.»
 *
 * Es el único sitio donde se puede leer: el alias no aparece en la URL ni en
 * ningún campo de un formulario, precisamente porque es lo único que se ve de
 * una cuenta ajena (§2.2).
 */
async function aliasInHeader(page) {
  const header = page.getByText(/Estás dentro como/)
  await expect(header).toBeVisible()

  return (await header.innerText()).replace('Estás dentro como', '').replace('.', '').trim()
}