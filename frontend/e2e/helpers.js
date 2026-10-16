import AxeBuilder from '@axe-core/playwright'

/**
 * Arranque común de los tests de navegador.
 */

/** Respuestas simuladas de la API (ver `playwright.config.js`). */
export const API_RESPONSES = {
  health: { status: 'ok', database: 'connected' },

  /** La cuenta con la que se finge haber iniciado sesión. */
  user: { username: 'carmen', alias: 'LoboTranquilo' },

  /** Clasificación global acumulada (R-001). `game_id` va `null` en esta vista. */
  leaderboard: {
    entries: [
      { alias: 'ArdillaViva', points: 121, game_id: null },
      { alias: 'LoboTranquilo', points: 100, game_id: null },
      { alias: 'MariposaSuave', points: 21, game_id: null },
    ],
    total: 3,
    has_more: false,
  },

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

  // La clasificación se ve sin sesión (§2.4, R-001). Lleva `game_id: null`
  // porque en la vista global esos puntos son la suma de todos los juegos.
  await page.route('**/api/leaderboard**', (route) =>
    route.fulfill({ json: API_RESPONSES.leaderboard }),
  )

  // Sin sesión: la lista de juegos se puede ver sin entrar (§2.4).
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { message: 'No has iniciado sesión.' } }),
  )

  // El chat exige sesión (R-009). Se responde con lo mismo que sin ella: si se
  // fingiera que hay sesión, los tests de accesibilidad auditarían una pantalla
  // con datos que en la vida real nadie ve sin entrar.
  await page.route('**/api/chat/messages**', (route) =>
    route.fulfill({ status: 401, json: { message: 'No has iniciado sesión.' } }),
  )

  await page.route('**/api/chat/limits', (route) =>
    route.fulfill({ json: { max_length: 500 } }),
  )
}

/**
 * Intercepta la API **con sesión abierta** (spec 007).
 *
 * El chat y el borrado de cuenta solo existen para quien ha entrado, así que
 * para probarlos hay que fingir que hay sesión. Se hace interceptando
 * `/auth/me`, igual que `stubApi` intercepta el 401: así el resto de la API
 * sigue yendo de verdad contra el backend del contenedor.
 */
export async function stubApiSignedIn(page, user = API_RESPONSES.user) {
  await stubApi(page)

  await page.unroute('**/api/auth/me')

  await page.route('**/api/auth/me', (route) =>
    route.fulfill({ json: { username: user.username, alias: user.alias } }),
  )
}

/** Un mensaje del chat con la forma que devuelve el servidor. */
export function chatMessage(id, body, extra = {}) {
  return {
    message_id: id,
    author_id: 1,
    alias: API_RESPONSES.user.alias,
    body,
    kind: 'user',
    created_at: '2026-10-16T12:00:00Z',
    is_mine: false,
    ...extra,
  }
}

/** Una respuesta de mensajes del chat con su marca de tiempo. */
export function chatResponse(messages, pollFrom = '2026-10-16T12:00:00Z') {
  return { messages, poll_from: pollFrom }
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

  /*
   * Espera a que terminen las animaciones antes de medir.
   *
   * La tarjeta de bienvenida entra con `opacity` de 0 a 1. Si axe mide mientras
   * va por el medio, ve el texto a medio fundido sobre su fondo y calcula un
   * ratio que no corresponde a ningún estado real: 1.07:1 donde el texto ya
   * settled da 15.76:1.
   *
   * No es maquillar el resultado: el contraste que hay que comprobar es el del
   * estado en el que se lee la página, y ese es el estado quieto. Con
   * `prefers-reduced-motion` la animación no existe (R-008), así que esta espera
   * no cambia qué se mide, solo deja de medir en el momento equivocado.
   */
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  )

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
