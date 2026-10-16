import { expect, test } from '@playwright/test'

import {
  AUDITED_SCREENS,
  auditAccessibility,
  chatMessage,
  chatResponse,
  screenUrl,
  stubApi,
  stubApiSignedIn,
} from './helpers.js'

/**
 * Auditoría automática de accesibilidad con axe-core (R-012, tarea 6.20).
 *
 * Es el punto 4 de §4.3: la accesibilidad **se prueba**, no se supone. Y una
 * Una violación nueva rompe la suite, que es lo que la spec pide.
 *
 * Qué cubre y qué no, con claridad:
 *
 * · axe mide lo que sabe medir: contraste, nombres accesibles, jerarquía de
 *   encabezados, etiquetas, orden del foco, `lang`. Eso es una parte.
 * · axe **no** sabe si un mensaje se entiende, ni si un botón está donde alguien
 *   lo esperaría, ni si el orden visual coincide con el del teclado. La revisión
 *   manual del checklist de §4.1 y §4.2 sigue siendo obligatoria: esta suite no
 *   la sustituye.
 * · Las violaciones de nivel AAA se filtran. El objetivo de conformidad es AA
 *   (§4) y el estándar no obliga a las AAA.
 */
for (const screen of AUDITED_SCREENS) {
  test(`axe-core no encuentra violaciones A ni AA en «${screen.name}»`, async ({ page }) => {
    await stubApi(page)
    await page.goto(screenUrl(screen))

    // Se espera a que la pantalla haya terminado de cargar sus datos: auditar
    // mientras se pinta «Cargando los juegos…» dejaría fuera la tarjeta que
    // después se dibuja con contenido de la API.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const violations = await auditAccessibility(page)

    const report = violations
      .map(
        (violation) =>
          `- [${violation.impact}] ${violation.id}: ${violation.help}\n` +
          `  ${violation.nodes.slice(0, 3).map((node) => `    · ${node.target.join(' ')}`).join('\n')}`,
      )
      .join('\n')

    expect(
      violations,
      `Violaciones de accesibilidad en «${screen.name}» (${screenUrl(screen)}):\n${report}`,
    ).toHaveLength(0)
  })
}

test('axe-core no encuentra violaciones en la pantalla de clasificación', async ({ page }) => {
  // No está en la lista de R-012, pero es una pantalla a la que se llega desde la
  // portada, y dejarla sin auditar sería dejar un hueco justo en el sitio donde
  // alguien acaba frustrado.
  await stubApi(page)
  await page.goto('http://localhost:5173/#/leaderboard')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  // Se espera a la tabla: auditar mientras sale «Cargando…» dejaría fuera
  // justamente lo que hay que auditar, que es la tabla.
  await expect(page.getByRole('table')).toBeVisible()

  const violations = await auditAccessibility(page)

  expect(violations, violations.map((v) => `- [${v.impact}] ${v.id}: ${v.help}`).join('\n')).toHaveLength(0)
})

test('axe-core no encuentra violaciones en el chat con la conversación llena', async ({ page }) => {
  // R-012 aplicado a la spec 007. Se audita **con mensajes**, no en vacío: la
  // pantalla vacía es la más fácil de aprobar y no tiene los mensajes, el
  // contador ni los botones de bloquear, que es donde puede haber problemas.
  await stubApiSignedIn(page)
  await page.route('**/api/chat/messages**', (route) =>
    route.fulfill({
      json: chatResponse([
        // Un mensaje de otra persona, con su botón de bloquear.
        chatMessage(1, 'Buenos días a todos'),
        // El propio: el botón de bloquear **no** debe aparecer (R-006).
        chatMessage(2, 'Hola', { is_mine: true }),
        // Y uno del sistema, que se tiene que distinguir de los otros (§6.4).
        {
          message_id: 3,
          author_id: null,
          alias: null,
          body: 'Bienvenido al chat',
          kind: 'system',
          created_at: '2026-10-16T12:00:00Z',
          is_mine: false,
        },
      ]),
    }),
  )

  await page.goto('http://localhost:5173/#/chat')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByText('Buenos días a todos')).toBeVisible()

  const violations = await auditAccessibility(page)

  expect(violations, violations.map((v) => `- [${v.impact}] ${v.id}: ${v.help}`).join('\n')).toHaveLength(0)
})

test('axe-core no encuentra violaciones en el chat sin sesión', async ({ page }) => {
  // El estado sin sesión también se audita: es el que ve quien llega a la URL
  // del chat sin haber entrado, y tiene sus propios textos (R-009).
  await stubApi(page)
  await page.goto('http://localhost:5173/#/chat')

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const violations = await auditAccessibility(page)

  expect(violations, violations.map((v) => `- [${v.impact}] ${v.id}: ${v.help}`).join('\n')).toHaveLength(0)
})

test('axe-core no encuentra violaciones con el aviso de borrar la cuenta abierto', async ({ page }) => {
  // R-010: el aviso de borrado es un `role="group"` con botones dentro. Está
  // abierto solo cuando alguien lo abre, así que una auditoría de la cabecera en
  // reposo nunca lo vería.
  await stubApiSignedIn(page)
  await page.goto('http://localhost:5173/#/')

  await page.getByRole('button', { name: 'Borrar mi cuenta' }).click()
  await expect(page.getByRole('group', { name: 'Vas a borrar tu cuenta' })).toBeVisible()

  const violations = await auditAccessibility(page)

  expect(violations, violations.map((v) => `- [${v.impact}] ${v.id}: ${v.help}`).join('\n')).toHaveLength(0)
})

test('axe-core no encuentra violaciones con los formularios rellenados y con error', async ({ page }) => {
  // Un formulario vacío es el estado más fácil de aprobar: no hay nada que leer.
  // El estado que de verdad importa es el de error, que es donde aparecen
  // `role="alert"`, `aria-invalid` y `aria-describedby` (R-009).
  await stubApi(page)
  await page.goto('http://localhost:5173/#/register')

  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()

  const violations = await auditAccessibility(page)

  expect(violations, violations.map((v) => `- [${v.impact}] ${v.id}: ${v.help}`).join('\n')).toHaveLength(0)
})
