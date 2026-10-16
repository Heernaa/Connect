import {
  createAccount,
  deleteAccount,
  expect,
  field,
  test,
} from './helpers.js'

/**
 * El chat contra el backend real (spec 008 · R-004).
 *
 * Tres cosas, en el orden en que las vive quien las usa: **enviar** un mensaje,
 * **verlo llegar** por el polling y **bloquear** a quien molesta.
 *
 * · El polling del chat **se para con la pestaña oculta** (§0.1), y una segunda
 *   pestaña en pruebas acaba oculta. Por eso quien mira el chat es la **única**
 *   página del test: así el recorrido mide el polling, no la visibilidad de la
 *   pestaña. Quien envía es una segunda cuenta, y escribe por la API porque es
 *   el mismo camino de red que el botón «Enviar» y deja el test con una sola
 *   pantalla que observar.
 * · El recorrido **espera al polling de verdad**: hasta diez segundos. No hay
 *   forma de probar R-004 sin esperar, y conviene que el coste esté a la vista
 *   en lugar de escondido en un reloj falso.
 */

test('enviar un mensaje, verlo llegar por el polling y bloquear a quien molesta', async ({
  browser,
}) => {
  // El polling llega cada diez segundos; el recorrido tiene que caber en eso.
  test.setTimeout(90_000)

  const writerContext = await browser.newContext()
  const readerContext = await browser.newContext()

  try {
    const writer = await createAccount(writerContext, { prefix: 'escritor' })
    await createAccount(readerContext, { prefix: 'lector' })

    /*
     * El chat es **una conversación compartida**: quien escribe ve lo que escriben
     * los demás. Los tres perfiles de dispositivo ejecutan este recorrido a la vez,
     * así que el texto del mensaje lleva el nombre de la cuenta, que es único por
     * construcción. Con un texto fijo, dos ejecuciones se mezclarían y el recorrido
     * comprobaría el mensaje del otro: pasaría sin haber mirado el suyo, y fallaría
     * al bloquear sin motivo.
     */
    const question = `¿Alguien juega a Wordle? ${writer.username}`
    const answer = `Sí, acabo de empezar. ${writer.username}`

    const page = await readerContext.newPage()
    const log = page.getByRole('log', { name: 'Mensajes' })

    await test.step('Abrir el chat y escribir el primer mensaje', async () => {
      await page.goto('/#/chat')

      await field(page, 'Escribe tu mensaje').fill(answer)
      await page.getByRole('button', { name: 'Enviar' }).click()

      await expect(log).toContainText(answer)
      await expect(log).toContainText('Tú')
    })

    await test.step('El mensaje de otra persona llega solo, en el polling', async () => {
      const sent = await writerContext.request.post('/api/chat/messages', {
        data: { body: question },
      })

      expect(sent.status()).toBe(201)

      // Diez segundos es lo que tarda el polling; el margen es para que un
      // runner lento no convierta un paso correcto en un fallo.
      await expect(log).toContainText(question, { timeout: 30_000 })
      await expect(log.getByRole('article').filter({ hasText: writer.alias })).toBeVisible()
    })

    await test.step('Bloquear a esa persona quita sus mensajes y le impide escribir', async () => {
      const message = log.getByRole('article').filter({ hasText: writer.alias })

      await message.getByRole('button', { name: `Bloquear a ${writer.alias}` }).click()

      await expect(
        page.getByText(`Has bloqueado a ${writer.alias}. No te llegará ningún mensaje más.`),
      ).toBeVisible()

      // Los mensajes de esa persona desaparecen, también después de recargar: lo
      // bloqueado no es una pantalla vacía, es un filtro en el servidor (§6.6).
      await expect(log).not.toContainText(question)

      await page.reload()

      await expect(page.getByRole('log', { name: 'Mensajes' })).not.toContainText(question)

      // Y su siguiente mensaje lo rechaza el servidor, con un motivo en
      // lenguaje llano y no con un código.
      const rejected = await writerContext.request.post('/api/chat/messages', {
        data: { body: 'Sigo aquí' },
      })

      expect(rejected.status()).toBe(403)
      expect((await rejected.json()).message).toContain('Alguien te ha bloqueado')
    })
  } finally {
    await deleteAccount(writerContext)
    await deleteAccount(readerContext)

    await writerContext.close().catch(() => null)
    await readerContext.close().catch(() => null)
  }
})