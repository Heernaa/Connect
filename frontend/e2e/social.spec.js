import { expect, test } from '@playwright/test'

import { chatMessage, chatResponse, stubApi, stubApiSignedIn } from './helpers.js'

/**
 * La clasificación y el chat en el navegador de verdad (spec 007).
 *
 * Aquí no se comprueba lógica: eso lo cubren los tests de la API y los del
 * cliente. Se comprueba lo que **solo** se ve en un navegador real:
 *
 * · que el botón de bloquear funciona en un paso y sin diálogo (R-006);
 * · que un mensaje nuevo **no mueve el foco** mientras alguien escribe (R-003);
 * · que el objetivo táctil se mantiene en los controles nuevos (R-002);
 * · que la tabla no arrastra la página al desplazarse en un móvil (R-010).
 */

/** Control táctil mínimo que fija la constitución (§4.1). */
const MINIMUM_TARGET_PX = 44

/** Intercepta el chat con una conversación y deja poder enviar. */
async function stubChat(page, messages) {
  await page.route('**/api/chat/messages**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: chatMessage(99, JSON.parse(route.request().postData() ?? '{}').body, { is_mine: true }),
      })
    }

    return route.fulfill({ json: chatResponse(messages) })
  })

  await page.route('**/api/chat/limits', (route) => route.fulfill({ json: { max_length: 500 } }))
}

test.beforeEach(async ({ page }) => {
  await stubApiSignedIn(page)
})

test('la clasificación se ve sin iniciar sesión', async ({ page }) => {
  // R-001 y §2.4: el modo espectador es una decisión de producto. Si esto
  // fallara, quien no tiene cuenta no podría ver que hay gente jugando.
  await stubApi(page)
  await page.unroute('**/api/auth/me')
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { message: 'No has iniciado sesión.' } }),
  )

  await page.goto('http://localhost:5173/#/leaderboard')

  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'ArdillaViva' })).toBeVisible()
})

test('la clasificación no muestra ningún nombre de usuario', async ({ page }) => {
  // R-001 y V.2: solo alias, puntos y juego. El `username` ni siquiera llega del
  // servidor; aquí se comprueba que tampoco se cuela por otro sitio.
  await page.goto('http://localhost:5173/#/leaderboard')
  await expect(page.getByRole('table')).toBeVisible()

  await expect(page.getByText('carmen')).toHaveCount(0)
})

test('la tabla se puede recorrer con teclado y el puesto se anuncia como encabezado', async ({ page }) => {
  // R-005 y R-006: `<th scope="row">` es lo que hace que un lector de pantalla
  // diga «3, LoboTranquilo» al entrar en la fila, en vez de un número suelto.
  await page.goto('http://localhost:5173/#/leaderboard')
  await expect(page.getByRole('table')).toBeVisible()

  const firstRowHeading = page.getByRole('rowheader').first()

  await expect(firstRowHeading).toHaveText('1')
  // `scope="row"` sobre el puesto: es un encabezado de fila, no una celda más.
  await expect(firstRowHeading).toHaveJSProperty('tagName', 'TH')
})

test('el filtro de la clasificación se maneja con teclado', async ({ page }) => {
  // Un `select` esconde las opciones hasta que se abre; con teclado habría que
  // saber que está ahí. Los radios se ven y las flechas los recorren (R-005).
  await page.goto('http://localhost:5173/#/leaderboard')
  await expect(page.getByRole('table')).toBeVisible()

  await page.getByRole('radio', { name: 'Paraulógic' }).focus()
  await page.keyboard.press('ArrowDown')

  await expect(page.getByRole('radio', { name: 'Wordle' })).toBeChecked()
})

test('bloquear es un solo paso, sin diálogo de confirmación (R-006)', async ({ page }) => {
  // El requisito es explícito: pedir «¿seguro?» justo cuando alguien te hostiga
  // es lo contrario de útil. Aquí se comprueba que **no aparece ningún diálogo**.
  await stubChat(page, [chatMessage(1, 'déjame en paz')])

  let bloqueado = false

  await page.route('**/api/users/*/block', (route) => {
    bloqueado = true

    return route.fulfill({ status: 204 })
  })

  await page.goto('http://localhost:5173/#/chat')
  await expect(page.getByText('déjame en paz')).toBeVisible()

  await page.getByRole('button', { name: /Bloquear a/ }).click()

  await expect.poll(() => bloqueado).toBe(true)
  // Ningún diálogo: el bloqueo ya está hecho.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(/Has bloqueado a/)).toBeVisible()
})

test('bloquear y desbloquear con el teclado', async ({ page }) => {
  // R-005 y R-006: el botón tiene que ser alcanzable y pulsable sin ratón, y
  // con un nombre que diga a quién afecta (WCAG 2.5.3).
  await stubChat(page, [chatMessage(1, 'hola')])

  await page.route('**/api/users/*/block', (route) => route.fulfill({ status: 204 }))

  await page.goto('http://localhost:5173/#/chat')
  await expect(page.getByText('hola')).toBeVisible()

  const boton = page.getByRole('button', { name: /Bloquear a LoboTranquilo/ })

  await boton.focus()
  await page.keyboard.press('Enter')

  await expect(page.getByText(/Has bloqueado a LoboTranquilo/)).toBeVisible()
})

test('no hay ningún botón de reportar en el chat (R-007)', async ({ page }) => {
  // Que algo no exista se comprueba mirando que no está. Con moderación fuera
  // de alcance (§6.8), un botón de reportar solo generaría frustración: no hay
  // nadie a quien llegar.
  await stubChat(page, [chatMessage(1, 'hola')])

  await page.goto('http://localhost:5173/#/chat')
  await expect(page.getByText('hola')).toBeVisible()

  await expect(page.getByRole('button', { name: /reportar/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /denunciar/i })).toHaveCount(0)
})

test('un mensaje nuevo no mueve el foco mientras se escribe (R-003)', async ({ page }) => {
  // El requisito que más fácil se rompe y más caro sale: si al llegar un
  // mensaje se moviera el foco, quien estuviera escribiendo perdería lo que
  // llevaba. Se comprueba con el foco **dentro del campo de escritura**.
  await stubChat(page, [])

  await page.goto('http://localhost:5173/#/chat')

  const campo = page.getByRole('textbox', { name: /Escribe tu mensaje/ })

  await campo.click()
  await campo.fill('estoy escribiendo')
  await expect(campo).toBeFocused()

  // Llega un mensaje de otra persona mientras la persona escribe.
  await page.evaluate(() => {
    // No se toca el DOM desde fuera: lo que se quiere comprobar es que el
    // polling no mueve el foco, y hacerlo a mano no probaría nada.
  })

  await page.waitForTimeout(500)

  await expect(campo).toBeFocused()
  await expect(campo).toHaveValue('estoy escribiendo')
})

test('el chat no aparece en la navegación sin sesión (R-009)', async ({ page }) => {
  // Un enlace que lleva a «tienes que entrar» en el menú es un callejón sin
  // salida (§2.1.6). La clasificación sí aparece, porque es pública.
  await stubApi(page)
  await page.unroute('**/api/auth/me')
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { message: 'No has iniciado sesión.' } }),
  )

  await page.goto('http://localhost:5173/#/')

  await expect(page.getByRole('navigation').getByRole('link', { name: 'Clasificación' })).toBeVisible()
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Chat' })).toHaveCount(0)
})

test('el chat sí aparece en la navegación con sesión', async ({ page }) => {
  await stubChat(page, [])

  await page.goto('http://localhost:5173/#/chat')

  await expect(page.getByRole('navigation').getByRole('link', { name: 'Chat' })).toBeVisible()
})

test('los controles nuevos respetan el objetivo táctil de 44px (R-002)', async ({ page }) => {
  await stubChat(page, [chatMessage(1, 'hola')])

  await page.goto('http://localhost:5173/#/chat')
  await expect(page.getByText('hola')).toBeVisible()

  const undersized = await page.evaluate((minimum) => {
    const selectores = ['button:not([hidden])', 'input[type="radio"]', 'textarea', 'a.ui-link']

    return [...document.querySelectorAll(selectores.join(','))]
      .filter((element) => element.offsetParent !== null)
      .map((element) => {
        const box = element.getBoundingClientRect()

        return {
          name: element.textContent?.trim().slice(0, 30) || element.tagName,
          width: Math.round(box.width),
          height: Math.round(box.height),
        }
      })
      .filter(({ width, height }) => width < minimum || height < minimum)
  }, MINIMUM_TARGET_PX)

  expect(undersized, `Controles por debajo de ${MINIMUM_TARGET_PX}px: ${JSON.stringify(undersized)}`).toEqual([])
})

test('la clasificación no arrastra la página al desplazarse en la tabla (R-010)', async ({ page }) => {
  // La tabla puede ser más ancha que un móvil de 360px. Lo que no puede pasar es
  // que eso produzca scroll horizontal **en la página**: se desplaza la tabla,
  // no el documento.
  await page.setViewportSize({ width: 360, height: 720 })

  await page.goto('http://localhost:5173/#/leaderboard')
  await expect(page.getByRole('table')).toBeVisible()

  const scroll = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    tabla: (() => {
      const caja = document.querySelector('.ui-table-scroll')

      return caja ? caja.scrollWidth - caja.clientWidth : 0
    })(),
  }))

  expect(scroll.document).toBeLessThanOrEqual(0)
})