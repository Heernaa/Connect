import { expect, test } from '@playwright/test'

import { AUDITED_SCREENS, screenUrl, stubApi } from './helpers.js'

/**
 * Escalado y reflow (R-001, R-010).
 *
 * La constitución exige dos cosas aquí, y ninguna se puede comprobar leyendo el
 * código: que el texto se pueda subir al 200% **y que se quede ahí al
 * recargar**, y que no haya scroll horizontal ni contenido solapado a 360px y al
 * 200% de zoom.
 *
 * El scroll horizontal es el síntoma de que algo se ha roto: significa que hay
 * un elemento más ancho que su contenedor. Se mide comparando el ancho del
 * documento con el de la ventana, con una tolerancia de 1px porque los
 * navegadores dan decimales al calcular.
 */

/**
 * Botón de agrandar texto **de la cabecera**.
 *
 * La portada tiene dos controles de tamaño —el de la cabecera y el de su
 * sección «Tamaño del texto»— porque quien acaba de llegar y no ve bien tiene
 * que poder arreglarlo sin buscarlo arriba. Los tests se fijan en el de la
 * cabecera, que es el que está en todas las pantallas.
 */
function increaseButton(page) {
  return page.locator('header').getByRole('button', { name: /Agrandar el texto/ })
}

/** Botón de reducir texto de la cabecera. */
function decreaseButton(page) {
  return page.locator('header').getByRole('button', { name: /Reducir el texto/ })
}

/** Pulsa «agrandar» hasta el tope, o hasta que se agoten los intentos. */
async function enlargeToMaximum(page) {
  const button = increaseButton(page)

  for (let step = 0; step < 10; step += 1) {
    if (await button.isDisabled()) break

    await button.click()
  }
}

/** Tolerancia de un píxel: los navegadores redondean de forma distinta. */
const ONE_PIXEL = 1

/** El móvil más estrecho que la constitución fija como objetivo (§7.1). */
const NARROWEST_VIEWPORT = { width: 360, height: 740 }

/** Anchos que se comprueban. Los tres son de primera clase (§7.1). */
const VIEWPORTS = [
  { name: 'móvil de 360px', ...NARROWEST_VIEWPORT },
  { name: 'tablet de 768px', width: 768, height: 1024 },
  { name: 'ordenador de 1280px', width: 1280, height: 800 },
]

for (const screen of AUDITED_SCREENS) {
  for (const viewport of VIEWPORTS) {
    test(`«${screen.name}» no tiene scroll horizontal en ${viewport.name}`, async ({ page }) => {
      await stubApi(page)
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(screenUrl(screen))
      await page.waitForLoadState('networkidle')

      const overflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      }))

      expect(
        overflow.documentWidth,
        `El documento mide ${overflow.documentWidth}px en una ventana de ${overflow.viewportWidth}px. ` +
          'Algo es más ancho que su contenedor.',
      ).toBeLessThanOrEqual(overflow.viewportWidth + ONE_PIXEL)
    })
  }

  test(`«${screen.name}» aguanta el 200% de tamaño de texto sin solaparse`, async ({ page }) => {
    await stubApi(page)
    await page.setViewportSize(NARROWEST_VIEWPORT)
    await page.goto(screenUrl(screen))
    await page.waitForLoadState('networkidle')

    // Se pulsa el botón de agrandar hasta el tope: es el recorrido real y
    // comprueba además que los botones se pueden pulsar sin ratón.
    await enlargeToMaximum(page)

    await expect(page.getByText('200 por ciento').first()).toBeVisible()

    // Con el texto al 200% sigue sin poder haber scroll horizontal.
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }))

    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + ONE_PIXEL)
  })
}

test('el tamaño de texto llega al 200% y se queda al recargar', async ({ page }) => {
  // Es el criterio de aceptación literal de R-001: se sube al 200% **y** sigue
  // ahí después de recargar. Sin la segunda parte, alguien que necesita el doble
  // tendría que volver a ampliarlo en cada visita.
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await enlargeToMaximum(page)

  await expect(page.getByText('200 por ciento').first()).toBeVisible()
  await expect(increaseButton(page)).toBeDisabled()

  // La fuente del navegador es la que hay que mirar: es la que hace que todo el
  // layout escale.
  const beforeReload = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  )

  await page.reload()
  await page.waitForLoadState('networkidle')

  const afterReload = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  )

  expect(beforeReload).toBeGreaterThanOrEqual(32)
  expect(afterReload).toBe(beforeReload)
  await expect(page.getByText('200 por ciento').first()).toBeVisible()
})

test('el tamaño de texto se puede reducir y volver a su tamaño', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const decrease = decreaseButton(page)

  // Ya está en el mínimo, así que no se puede reducir más.
  await expect(decrease).toBeDisabled()

  await increaseButton(page).click()
  await expect(decrease).toBeEnabled()

  await decrease.click()
  await expect(decrease).toBeDisabled()
  await expect(page.getByText('100 por ciento').first()).toBeVisible()
})

test('el texto no se solapa con el tamaño al doble', async ({ page }) => {
  // El reflow no es solo «no hay scroll horizontal»: también es que dos bloques
  // no se pisen al crecer. Se comprueba que los bloques principales de la
  // portada están ordenados de arriba abajo, sin solaparse.
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await enlargeToMaximum(page)

  const overlaps = await page.evaluate(() => {
    const sections = [...document.querySelectorAll('main section')]

    const pairs = []

    for (let index = 0; index < sections.length; index += 1) {
      for (let other = index + 1; other < sections.length; other += 1) {
        const a = sections[index].getBoundingClientRect()
        const b = sections[other].getBoundingClientRect()

        const overlapsVertically = a.top < b.bottom && b.top < a.bottom
        const overlapsHorizontally = a.left < b.right && b.left < a.right

        if (overlapsVertically && overlapsHorizontally) {
          pairs.push(`${sections[index].id || 'sección'} sobre ${sections[other].id || 'sección'}`)
        }
      }
    }

    return pairs
  })

  expect(overlaps, `Secciones solapadas: ${overlaps.join(', ')}`).toHaveLength(0)
})
