import {
  createAccount,
  deleteAccount,
  expect,
  field,
  sampleParaulogicWord,
  test,
} from './helpers.js'

/**
 * El progreso sobrevive a cerrar el navegador (spec 008 · R-003).
 *
 * Aquí no se recorta nada: se cierra el contexto del navegador entero —con sus
 * cookies y todo— y se abre otro, como quien cierra la aplicación y vuelve al día
 * siguiente. Si el progreso estuviera en el navegador o en memoria del proceso,
 * se perdería en ese momento; si vive en PostgreSQL (§7), sigue ahí.
 *
 * La vuelta se hace **entrando otra vez con el nombre de usuario**, porque al
 * abrir un navegador nuevo no hay cookie: lo que se comprueba es que la partida
 * pertenece a la cuenta, no a una sesión concreta.
 */

test('el progreso de Paraulógic sobrevive a recargar y a cerrar el navegador', async ({
  browser,
}) => {
  const word = sampleParaulogicWord()
  const first = await browser.newContext()

  try {
    const account = await createAccount(first)
    const page = await first.newPage()

    await test.step('Encontrar una palabra a mitad de la partida', async () => {
      await page.goto('/#/game/paraulogic')

      await field(page, 'Escribe una palabra').fill(word)
      await page.getByRole('button', { name: 'Comprobar la palabra' }).click()

      await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()
      await expect(page.getByRole('list', { name: 'Palabras encontradas (1)' })).toContainText(word)
    })

    await test.step('Recargar a mitad de partida no pierde nada', async () => {
      await page.reload()

      await expect(page.getByRole('list', { name: 'Palabras encontradas (1)' })).toContainText(word)
      await expect(page.getByText('Tus puntos: 1 punto')).toBeVisible()
    })

    await test.step('Cerrar el navegador y volver deja la partida donde estaba', async () => {
      await first.close()

      const second = await browser.newContext()

      try {
        const reopened = await second.newPage()

        await reopened.goto('/#/login')
        await field(reopened, 'Nombre de usuario').fill(account.username)
        await field(reopened, 'Contraseña').fill(account.password)
        await reopened.getByRole('button', { name: 'Entrar' }).click()

        await reopened.goto('/#/game/paraulogic')

        await expect(reopened.getByRole('list', { name: 'Palabras encontradas (1)' })).toContainText(
          word,
        )
        await expect(reopened.getByText('Tus puntos: 1 punto')).toBeVisible()

        // Y se puede **seguir** jugando: la partida no quedó cerrada al cerrarse
        // el navegador, solo guardada (§2.1.7).
        await field(reopened, 'Escribe una palabra').fill(sampleParaulogicWord(word))
        await reopened.getByRole('button', { name: 'Comprobar la palabra' }).click()

        await expect(reopened.getByText('Tus puntos: 2 puntos')).toBeVisible()
      } finally {
        await deleteAccount(second)
        await second.close()
      }
    })
  } finally {
    // Si algo falla antes de cerrar el contexto a mano, la cuenta se borra
    // igualmente: la base de datos de desarrollo la ve también quien juega.
    await deleteAccount(first)
    await first.close().catch(() => null)
  }
})