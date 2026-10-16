import AxeBuilder from '@axe-core/playwright'

/**
 * Arranque común de los tests de navegador.
 */

/** Respuestas simuladas de la API (ver `playwright.config.js`). */
export const API_RESPONSES = {
  health: { status: 'ok', database: 'connected' },
  games: [
    {
      game_id: 'paraulogic',
      name: 'Paraulógic',
      description: 'Un conjunto de letras forma muchas palabras. Intenta encontrar todas.',
    },
    {
      game_id: 'wordle',
      name: 'Wordle',
      description: 'Adivina la palabra de cinco letras. Tienes seis intentos.',
    },
    {
      game_id: 'acertijo',
      name: 'Acertijo',
      description: 'Lee la pregunta y escribe la respuesta que estés pensando.',
    },
  ],
}

/**
 * Intercepta la API con respuestas simuladas.
 *
 * Se llama **antes** de navegar. Si no, la primera petición sale a la red y la
 * pantalla carga de verdad: la auditoría dejaría de ser reproducible y dependería
 * de que el backend esté en pie (§4.3).
 */
export async function stubApi(page) {
  await page.route('**/api/health', (route) =>
    route.fulfill({ json: API_RESPONSES.health }),
  )

  await page.route('**/api/games', (route) => route.fulfill({ json: API_RESPONSES.games }))

  // Sin sesión: la lista de juegos se puede ver sin entrar (§2.4).
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { message: 'No has iniciado sesión.' } }),
  )
}

/**
 * Audita una pantalla con axe-core.
 *
 * Se devuelven **solo las violaciones de nivel A y AA**, que es lo que exige la
 * spec (R-012). Se filtran las de nivel AAA: el estándar no obliga a ellas y
 * metarlas en la lista convertiría la auditoría en algo que nadie puede pasar.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ include?: string, rules?: object }} [options]
 */
export async function auditAccessibility(page, options = {}) {
  let builder = new AxeBuilder({ page })

  // El documento entero, o un fragmento si se quiere auditar un diálogo suelto.
  if (options.include !== undefined) builder = builder.include(options.include)

  if (options.rules !== undefined) builder = builder.options(options.rules)

  const results = await builder.analyze()

  return results.violations.filter((violation) => violation.impact !== null)
}

/** Las cuatro pantallas que R-012 obliga a auditar. */
export const AUDITED_SCREENS = [
  { name: 'portada', hash: '' },
  { name: 'lista de juegos', hash: '#/games' },
  { name: 'registro', hash: '#/register' },
  { name: 'login', hash: '#/login' },
]

/** Las cuatro pantallas con su URL completa, para los mensajes del informe. */
export function screenUrl(screen) {
  return `http://localhost:5173/${screen.hash}`
}
