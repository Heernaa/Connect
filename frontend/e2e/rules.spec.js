import { expect, test } from '@playwright/test'

import { stubApi } from './helpers.js'

/**
 * Reglas que la spec exige de forma expresa y que no son reglas de axe-core:
 * no depender del color (R-004) y respetar `prefers-reduced-motion` (R-008).
 *
 * El objetivo táctil ya se comprueba en `keyboard.spec.js` y el reflow, en
 * `reflow.spec.js`.
 */

/**
 * Ningún estado se transmite solo por color (R-004).
 *
 * Se comprueba en el navegador y no leyendo el código porque lo que importa es
 * lo que ve la persona: que al no distinguir rojo de verde, o con la pantalla en
 * escala de grises, la información siga estando.
 */
test('ningún estado depende solo del color', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const indicators = page.locator('.ui-status')
  const total = await indicators.count()

  expect(total, 'No se ha encontrado ningún indicador de estado').toBeGreaterThan(0)

  for (let index = 0; index < total; index += 1) {
    const indicator = indicators.nth(index)
    const text = (await indicator.innerText()).trim()

    // Canal 1 y 2: frase e icono. El color es el canal 3, y nunca el único.
    expect(text.length, `El indicador ${index} no tiene texto`).toBeGreaterThan(0)

    const icon = indicator.locator('.ui-status__icon')

    await expect(icon, `El indicador ${index} no tiene icono`).toHaveCount(1)

    const iconText = (await icon.innerText()).trim()

    expect(iconText.length, `El icono del indicador ${index} está vacío`).toBeGreaterThan(0)
  }
})

/**
 * Los estados se distinguen sin color.
 *
 * No es un capricho: hay quien lee con la pantalla en escala de grises, por
 * comodidad o por una baja visión. Con `forced-colors` el navegador sustituye
 * todos los colores; si el estado solo se distinguía por el tono, aquí no
 * quedaría nada.
 */
test('los estados se distinguen sin color', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await page.emulateMedia({ forcedColors: 'active' })

  const text = await page.locator('.ui-status').first().innerText()

  expect(text.trim().length, 'El estado desaparece en modo sin color').toBeGreaterThan(0)
})

/**
 * `prefers-reduced-motion` desactiva las animaciones (R-008).
 *
 * No se comprueba que la regla CSS exista, sino que **la duración sea cero** con
 * la preferencia activada. Una animación «muy corta» sigue siendo una animación
 * y sigue provocando vértigo a quien la ha pedido desactivada.
 */
test('las animaciones se desactivan con prefers-reduced-motion', async ({ page }) => {
  await stubApi(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const durations = await page.evaluate(() =>
    [...document.querySelectorAll('.ui-enter')].map(
      (element) => Number.parseFloat(getComputedStyle(element).animationDuration),
    ),
  )

  expect(durations.length, 'No se ha encontrado ninguna animación de entrada').toBeGreaterThan(0)

  for (const duration of durations) {
    // 0.01ms es el valor con el que los navegadores anulan una animación sin
    // romper los eventos `animationend`.
    expect(duration).toBeLessThanOrEqual(0.01)
  }
})

/** Sin la preferencia, la animación de entrada sí dura lo que debe (R-008). */
test('sin la preferencia, la animación de entrada tiene duración', async ({ page }) => {
  await stubApi(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const durations = await page.evaluate(() =>
    [...document.querySelectorAll('.ui-enter')].map(
      (element) => Number.parseFloat(getComputedStyle(element).animationDuration),
    ),
  )

  expect(durations.length).toBeGreaterThan(0)

  for (const duration of durations) {
    expect(duration).toBeGreaterThan(0.1)
  }
})

/** El scroll suave se desactiva con menos movimiento (R-008). */
test('el scroll suave se desactiva con prefers-reduced-motion', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')

  await page.emulateMedia({ reducedMotion: 'reduce' })

  const behavior = await page.evaluate(
    () => getComputedStyle(document.documentElement).scrollBehavior,
  )

  expect(behavior).toBe('auto')
})

/**
 * Ninguna pantalla de la base caduca contenido sin avisar (§4.1).
 *
 * En esta spec no hay partidas ni relojes, así que el requisito se traduce en
 * lo comprobable: la interfaz base no arranca ningún temporizador repetido. Si
 * mañana aparece un `setInterval` que quite algo de la pantalla, este test lo
 * señala en el acto.
 */
test('la interfaz base no arranca temporizadores repetidos', async ({ page }) => {
  await stubApi(page)

  // Se cuenta antes de que se ejecute nada de la aplicación, sustituyendo los
  // temporizadores globales en `addInitScript`, que se lanza en cada documento
  // antes de sus scripts.
  await page.addInitScript(() => {
    window.__connectIntervals = []

    const original = window.setInterval

    window.setInterval = function countedInterval(...args) {
      window.__connectIntervals.push(new Error('setInterval').stack ?? '')

      return original.apply(this, args)
    }
  })

  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  // Se filtran los que crea el cliente de Vite: en desarrollo levanta su propio
  // `setInterval` para la recarga en caliente, y no es código de la aplicación.
  // Se distingue por la pila de llamadas en vez de por la posición, que cambia
  // entre versiones.
  const fromOurCode = await page.evaluate(() =>
    window.__connectIntervals.filter((stack) => !stack.includes('@vite/client')),
  )

  expect(
    fromOurCode,
    `Hay ${fromOurCode.length} temporizadores repetidos del código de la aplicación:\n` +
      fromOurCode.map((stack) => stack.split('\n').slice(1, 4).join('\n')).join('\n---\n') +
      '\n\nNinguna pantalla puede expirar contenido sin avisar antes (§4.1).',
  ).toHaveLength(0)
})
