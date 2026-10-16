import {
  apiJson,
  createAccount,
  deleteAccount,
  expect,
  field,
  seedContent,
  test,
} from './helpers.js'

/**
 * El acertijo contra el backend real (spec 008 · R-002).
 *
 * Lo que se comprueba: que se puede **fallar**, que fallar **no resta nada** y
 * que acertar después de fallar vale exactamente lo mismo que acertar a la
 * primera. Es la promesa que hace el juego antes de que nadie escriba nada
 * (§2.1.5) y la que se rompía si el castigo estuviera escondido.
 */

/** La cuenta que crea el recorrido se borra: la base es la de desarrollo. */
test.afterEach(async ({ context }) => {
  await deleteAccount(context)
})

test('fallar no resta nada y acertar después vale lo mismo', async ({ page, context }) => {
  await createAccount(context)

  const answer = seedContent().riddleAnswer

  await test.step('Responder mal no resta puntos y deja seguir jugando', async () => {
    await page.goto('/#/game/riddle')

    await field(page, 'Tu respuesta').fill('el unicornio')
    await page.getByRole('button', { name: 'Comprobar la respuesta' }).click()

    await expect(page.getByText('No es esa. Vuelve a pensarlo: fallar no te resta nada.')).toBeVisible()
    await expect(page.getByText('Tus puntos: 0 puntos')).toBeVisible()
    await expect(page.getByText('Respuestas que has escrito: 1')).toBeVisible()

    const session = await apiJson(context.request, '/api/games/riddle/session')

    expect(session.solved).toBe(false)
    expect(session.score).toBe(0)
  })

  await test.step('Acertar después de fallar suma los 10 puntos enteros', async () => {
    await field(page, 'Tu respuesta').fill(answer)
    await page.getByRole('button', { name: 'Comprobar la respuesta' }).click()

    await expect(page.getByText('¡Correcto! Has acertado y sumas 10 puntos.')).toBeVisible()
    await expect(page.getByText('Tus puntos: 10 puntos')).toBeVisible()

    const session = await apiJson(context.request, '/api/games/riddle/session')

    expect(session.solved).toBe(true)
    expect(session.score).toBe(10)
    expect(session.attempts_used).toBe(2)
  })

  await test.step('Al volver a la partida ya acertada, el campo ya no está', async () => {
    await page.reload()

    await expect(page.getByText('Ya lo has acertado')).toBeVisible()
    await expect(field(page, 'Tu respuesta')).toHaveCount(0)

    // El servidor nunca devuelve la respuesta correcta, ni al terminar la
    // partida: se deduce de la pregunta, no se lee de la API (§2.1.2).
    const content = await context.request.get('/api/games/riddle')

    expect(await content.text()).not.toContain(answer)
  })
})