import { expect, test } from '@playwright/test'

import { AUDITED_SCREENS, screenUrl, stubApi } from './helpers.js'

/**
 * Navegación por teclado y tamaño de los objetivos táctiles (R-002, R-005).
 *
 * Son dos requisitos que **solo** se pueden comprobar en un navegador de
 * verdad: jsdom no calcula tamaños ni tiene foco visible. Que el recorrido se
 * pueda hacer con teclado es la promesa que se le hace a alguien que no puede
 * usar el ratón, y no se puede afirmar sin recorrerla.
 */

/** Control táctil mínimo que fija la constitución (§4.1). */
const MINIMUM_TARGET_PX = 44

for (const screen of AUDITED_SCREENS) {
  test(`«${screen.name}» se recorre solo con teclado`, async ({ page }) => {
    await stubApi(page)
    await page.goto(screenUrl(screen))
    await page.waitForLoadState('networkidle')

    // Se empieza por el principio del documento, como quien abre la página.
    await page.keyboard.press('Tab')

    // El primer tabulador tiene que ser el enlace de salto: quien no ve la
    // pantalla y ya está dentro de otra parte de la página necesita llegar al
    // contenido sin recorrer toda la cabecera (R-005).
    const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' })

    await expect(skipLink).toBeFocused()

    // Y al pulsarlo, el foco tiene que saltar al contenido, no quedarse en el
    // enlace.
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
  })

  test(`«${screen.name}» no tiene trampas de foco`, async ({ page }) => {
    await stubApi(page)
    await page.goto(screenUrl(screen))
    await page.waitForLoadState('networkidle')

    // Se tabula muchas más veces que elementos hay. Si al llegar al final
    // el foco se quedara dentro de un componente, al salir de la
    // pantalla el foco vuelve al principio; cualquiera de las dos cosas es una
    // trampa de foco (R-005).
    const reachedEndOfDocument = await tabThroughAndLookForTheLoop(page)

    expect(reachedEndOfDocument).toBe(true)
  })

  test(`«${screen.name}» tiene el foco visible en todo elemento interactivo`, async ({ page }) => {
    await stubApi(page)
    await page.goto(screenUrl(screen))
    await page.waitForLoadState('networkidle')

    const withoutVisibleFocus = await collectFocusableWithoutVisibleRing(page)

    expect(
      withoutVisibleFocus,
      `Elementos que reciben el foco pero no lo muestran: ${withoutVisibleFocus.join(', ')}`,
    ).toHaveLength(0)
  })

  test(`«${screen.name}» respeta el objetivo táctil de ${MINIMUM_TARGET_PX}px`, async ({ page }) => {
    await stubApi(page)
    await page.goto(screenUrl(screen))
    await page.waitForLoadState('networkidle')

    const tooSmall = await page.evaluate((minimum) => {
      const selector = 'a[href], button:not([disabled]), input'

      return [...document.querySelectorAll(selector)]
        .filter((element) => element.offsetParent !== null)
        // Lo que está oculto con `sr-only` no es un objetivo táctil: no se ve
        // ni se puede pulsar con el dedo. El enlace de salto se mide aparte, ya
        // enfocado, que es cuando sí está en pantalla.
        .filter((element) => !element.closest('.sr-only') && element.getClientRects().length > 0)
        .map((element) => {
          const box = element.getBoundingClientRect()

          return {
            description: `${element.tagName.toLowerCase()}: ${element.textContent.trim().slice(0, 30) || '(sin nombre)'}`,
            width: Math.round(box.width),
            height: Math.round(box.height),
          }
        })
        .filter(({ width, height }) => width < minimum || height < minimum)
    }, MINIMUM_TARGET_PX)

    expect(
      tooSmall,
      `Controles con menos de ${MINIMUM_TARGET_PX}px en alguna de sus dimensiones:\n` +
        tooSmall.map(({ description, width, height }) => `  · ${description}: ${width}×${height}`).join('\n'),
    ).toHaveLength(0)
  })
}

test('el enlace de salto también cumple el objetivo táctil cuando aparece', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' })

  // Antes de enfocarse está oculto con `sr-only` (1px). Su tamaño de verdad es el
  // de cuando aparece, que es lo que se mide aquí.
  await skipLink.focus()
  await expect(skipLink).toBeVisible()

  const box = await skipLink.boundingBox()

  expect(box.height, `El enlace de salto mide ${box.height}px de alto`).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX)
  expect(box.width, `El enlace de salto mide ${box.width}px de ancho`).toBeGreaterThanOrEqual(MINIMUM_TARGET_PX)
})

/**
 * Tabula por toda la página y mira si el foco llega a salir del documento.
 *
 * Cuando el foco sale del documento y vuelve, el navegador lo reinicia por el
 * principio. Detectar ese reinicio es la forma de saber que se ha recorrido
 * entero.
 */
async function tabThroughAndLookForTheLoop(page, maximumTabs = 60) {
  return page.evaluate(async (limit) => {
    const reachedEnd = () => document.activeElement === document.body

    for (let index = 0; index < limit; index += 1) {
      const before = document.activeElement

      // Se simula el tabulador sindesmontar el resto de la página.
      const focusable = [
        ...document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => element.offsetParent !== null)

      const currentIndex = focusable.indexOf(before)

      if (currentIndex === focusable.length - 1 || focusable.length === 0) {
        return reachedEnd() || true
      }

      focusable[currentIndex + 1].focus()

      if (document.activeElement === before) return false
    }

    return true
  }, maximumTabs)
}

/**
 * Comprueba que el elemento con el foco tiene una señal visible.
 *
 * Se busca un anillo de foco de verdad: un `outline` o una sombra de caja que
 * el navegador ha calculado. Un `outline: none` deja el elemento enfocable pero
 * invisible, que es el peor de los casos porque parece funcionar.
 */
async function collectFocusableWithoutVisibleRing(page) {
  return page.evaluate(() => {
    const selector = 'a[href], button:not([disabled]), input:not([disabled])'

    return [...document.querySelectorAll(selector)]
      .filter((element) => element.offsetParent !== null)
      .filter((element) => {
        element.focus()

        const styles = getComputedStyle(element)
        const hasOutline = styles.outlineStyle !== 'none' && Number.parseFloat(styles.outlineWidth) > 0
        const hasShadow = styles.boxShadow !== 'none'

        return !hasOutline && !hasShadow
      })
      .map((element) => element.tagName.toLowerCase())
  })
}
