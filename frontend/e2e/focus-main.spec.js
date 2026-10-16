import { expect, test } from '@playwright/test'

import { stubApi } from './helpers.js'

/**
 * El indicador de foco de `main` (R-005).
 *
 * `main` no es interactivo, pero recibe el foco por script al cambiar de
 * pantalla, y hereda el anillo general de `:focus-visible`. Ese anillo es un
 * `box-shadow` exterior, así que se dibujaba alrededor de **todo** el contenido:
 * un recuadro azul de casi mil píxeles de ancho, que se quedaba ahí hasta que
 * se volvía a tabular.
 *
 * Ahora el foco en `main` se marca con una **barra en el borde superior**: se
 * ve dónde ha entrado el foco y no encierra el texto en una caja que parece un
 * error.
 *
 * ## Por qué estas pruebas usan el teclado y no el ratón
 *
 * Tras un clic, el navegador **no** aplica `:focus-visible` a `main`, porque
 * quien pulsó tenía el ratón en la mano. Ese comportamiento es correcto y no se
 * toca: un recuadno que aparece después de cada clic sería ruido.
 *
 * El indicador importa cuando alguien navega con el teclado, así que eso es lo
 * que se comprueba: tabular, pulsar Intro y mirar qué se ve.
 *
 * ## Dos cosas que no habrían servido
 *
 * · `focus:outline-none` en la clase del componente: apaga el `outline` y
 *   deja vivo el `box-shadow`, así que el recuadno se seguía viendo.
 * · Buscar solo el `outline` en el test: habría pasado con el bug presente.
 */

/** El enlace «Juegos» de la barra de navegación. */
function gamesNavLink(page) {
  return page.locator('nav').getByRole('link', { name: 'Juegos' })
}

/** Llega al enlace de navegación con el teclado y lo activa. */
async function navigateToGamesWithKeyboard(page) {
  await gamesNavLink(page).focus()
  await page.keyboard.press('Enter')
}

/** Cómo se ve el foco en `main` ahora mismo. */
function focusStyles(locator) {
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element)

    return {
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      boxShadow: computed.boxShadow,
      matchesFocusVisible: element.matches(':focus-visible'),
    }
  })
}

test('con el teclado, main no queda encerrado en un recuadro', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await navigateToGamesWithKeyboard(page)

  const main = page.locator('#main-content')

  await expect(main).toBeFocused()

  const styles = await focusStyles(main)

  expect(styles.matchesFocusVisible).toBe(true)

  // Sin recuadro exterior. Se comprueban las dos propiedades porque
  // `focus:outline-none` solo apaga una de ellas.
  expect(styles.outlineStyle, 'main conserva un outline exterior').toBe('none')
  expect(styles.boxShadow).toContain('inset')
  expect(
    /(^|\s)0px\s+0px\s+0px\s+\d/.test(styles.boxShadow),
    `main sigue con un anillo exterior: ${styles.boxShadow}`,
  ).toBe(false)
})

test('con el teclado, main sí muestra un indicador, no ninguno', async ({ page }) => {
  // Quitar el recuadro no puede significar quitar la señal: quien navega solo
  // con teclado necesita saber que el foco ha entrado en el contenido.
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await navigateToGamesWithKeyboard(page)

  const main = page.locator('#main-content')

  await expect(main).toBeFocused()

  const styles = await focusStyles(main)

  expect(styles.boxShadow !== 'none' || styles.outlineStyle !== 'none').toBe(true)
})

test('el enlace de salto también lleva el foco a main con la barra', async ({ page }) => {
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')

  const main = page.locator('#main-content')

  await expect(main).toBeFocused()

  const styles = await focusStyles(main)

  expect(styles.boxShadow).toContain('inset')
})

test('tras un clic de ratón no aparece el indicador', async ({ page }) => {
  // Comprobación de que no se ha roto el comportamiento por defecto del
  // navegador: quien navega con el ratón no merece un recuadro en cada cambio
  // de pantalla, y este test avisa si alguien lo fuerza con `:focus` en vez de
  // `:focus-visible`.
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await gamesNavLink(page).click()

  const main = page.locator('#main-content')

  await expect(main).toBeFocused()

  const styles = await focusStyles(main)

  expect(styles.matchesFocusVisible).toBe(false)
  expect(styles.boxShadow).toBe('none')
})

test('en modo sin color el indicador de main sigue viéndose', async ({ page }) => {
  // `forced-colors` borra los `box-shadow`, así que la barra desaparecería y el
  // foco de `main` se quedaría sin ninguna señal. Ahí tiene que aparecer el
  // `outline` como alternativa.
  await stubApi(page)
  await page.emulateMedia({ forcedColors: 'active' })
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  await navigateToGamesWithKeyboard(page)

  const main = page.locator('#main-content')

  await expect(main).toBeFocused()

  const styles = await focusStyles(main)

  expect(styles.outlineStyle).not.toBe('none')
  expect(Number.parseFloat(styles.outlineWidth)).toBeGreaterThan(0)
})

test('la barra de foco no desplaza el contenido', async ({ page }) => {
  // La barra es un `box-shadow` interno justamente para no mover nada. Si
  // alguien la cambiara por un `border`, el contenido bajaría 4px al recibir el
  // foco y la página saltaría en cada cambio de pantalla.
  //
  // Las dos medidas se toman **en la misma pantalla**, a través del enlace de
  // salto: antes y después de que `main` reciba el foco. Comparar pantallas
  // distintas no serviría, porque cada una tiene una estructura distinta y el
  // margen depende de ella.
  await stubApi(page)
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')

  const main = page.locator('#main-content')

  /** Margen entre el borde superior de `main` y su primer título. */
  const margen = () =>
    main.evaluate((element) => {
      const mainBox = element.getBoundingClientRect()
      const heading = element.querySelector('h1')

      return Math.round(heading.getBoundingClientRect().top - mainBox.top)
    })

  const sinFoco = await margen()

  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(main).toBeFocused()

  const conFoco = await margen()

  expect(conFoco, 'el contenido baja al recibir el foco en main').toBe(sinFoco)
})
