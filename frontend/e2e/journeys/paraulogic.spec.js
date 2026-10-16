import {
  apiJson,
  createAccount,
  deleteAccount,
  expect,
  field,
  sampleParaulogicWord,
  seedContent,
  test,
} from './helpers.js'

/**
 * Paraulógic contra el backend real (spec 008 · R-002 · V.3 y V.4).
 *
 * Tres cosas que el juego promete y que aquí se comprueban de una vez, porque se
 * rompen juntas: una palabra del conjunto suma un punto, **pedir una pista no
 * resta nada** y las palabras encontradas se quedan guardadas.
 */

/** La cuenta que crea el recorrido se borra: la base es la de desarrollo. */
test.afterEach(async ({ context }) => {
  await deleteAccount(context)
})

test('una palabra del conjunto suma un punto y la pista no resta nada', async ({
  page,
  context,
}) => {
  await createAccount(context)

  const content = await apiJson(context.request, '/api/games/paraulogic')
  const word = sampleParaulogicWord()

  await test.step('Escribir letras que no forman una palabra no cuesta nada', async () => {
    await page.goto('/#/game/paraulogic')

    await field(page, 'Escribe una palabra')
      .fill(wordOutsideTheSet(content.letters, seedContent().paraulogicWords))
    await page.getByRole('button', { name: 'Comprobar la palabra' }).click()

    // El mensaje dice «prueba otra» y no «incorrecto», y no enseña ningún
    // contador de fallos: en este juego no se puede perder (§2.1.4).
    await expect(
      page.getByText('Esas letras están bien, pero esa palabra no es una de las del juego'),
    ).toBeVisible()
    await expect(page.getByText('Tus puntos: 0 puntos')).toBeVisible()
  })

  await test.step('Encontrar una palabra del conjunto suma un punto', async () => {
    await field(page, 'Escribe una palabra').fill(word)
    await page.getByRole('button', { name: 'Comprobar la palabra' }).click()

    await expect(page.getByText(`¡Muy bien! Has encontrado ${word}.`)).toBeVisible()
    await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Palabras encontradas (1)' })).toContainText(word)

    const session = await apiJson(context.request, '/api/games/paraulogic/session')

    expect(session.score).toBe(1)
    expect(session.found_words).toEqual([word])
    expect(session.pending_count).toBe(content.pending_count - 1)
  })

  await test.step('Pedir una pista enseña la longitud y no resta puntos', async () => {
    await page.getByRole('button', { name: 'Pedir una pista' }).click()

    await expect(page.getByText(/Una de las palabras que te faltan tiene/)).toBeVisible()
    await expect(page.getByText(/Esta pista es de una palabra (bastante|poco) común/)).toBeVisible()

    // Lo que no puede pasar: que la pista haya costado puntos. Se comprueba en
    // la pantalla y en el servidor, que es quien puntúa (§6.6).
    await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()

    const session = await apiJson(context.request, '/api/games/paraulogic/session')

    expect(session.score).toBe(1)
  })

  await test.step('Las palabras encontradas siguen ahí después de recargar', async () => {
    await page.reload()

    await expect(page.getByRole('list', { name: 'Palabras encontradas (1)' })).toContainText(word)
    await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()
  })
})

/**
 * Una combinación de letras del conjunto que **no** es ninguna de las palabras
 * del juego, para comprobar que fallar no penaliza (§2.1.4).
 *
 * Se busca girando las letras del conjunto y se comprueba contra la lista del
 * seed en lugar de suponerlo: si por casualidad la combinación fuera una
 * palabra válida, el test estaría comprobando una cosa distinta de la que dice
 * comprobar, y pasaría sin haber fallado nunca.
 */
function wordOutsideTheSet(letters, knownWords) {
  for (let shift = 1; shift < letters.length; shift += 1) {
    const candidate = letters.slice(shift) + letters.slice(0, shift)

    if (!knownWords.includes(candidate)) return candidate
  }

  throw new Error(`Todas las combinaciones giradas de «${letters}» son palabras del juego.`)
}