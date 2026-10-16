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

  /*
   * `played` y `score` los añade la spec 006 · R-018. El validador del cliente
   * los exige: sin ellos la lista **entera** falla y la pantalla se queda vacía.
   * Por eso no hay una versión «mínima» de esta fixture.
   */
  games: [
    {
      game_id: 'paraulogic',
      name: 'Paraulógic',
      description: 'Un conjunto de letras forma muchas palabras. Intenta encontrar todas.',
      played: false,
      score: 0,
    },
    {
      game_id: 'wordle',
      name: 'Wordle',
      description: 'Adivina la palabra de cinco letras. Tienes seis intentos.',
      played: true,
      score: 100,
    },
    {
      game_id: 'riddle',
      name: 'Acertijo',
      description: 'Lee la pregunta y escribe la respuesta que estés pensando.',
      played: false,
      score: 0,
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

/** Contenido y sesión de Paraulógic. */
export const PARAULOGIC = {
  content: { letters: 'AENRST', pending_count: 3 },
  session: {
    game_id: 'paraulogic',
    status: 'active',
    found_words: [],
    pending_count: 3,
    score: 0,
  },
  /** Con dos palabras ya encontradas: es el estado de quien vuelve (§2.1.7). */
  sessionEnMarcha: {
    game_id: 'paraulogic',
    status: 'active',
    found_words: ['LUNAS', 'TREN'],
    pending_count: 19,
    score: 2,
  },
}

/** Contenido y sesión de Wordle. */
export const WORDLE = {
  content: { word: 'LUNAS', already_finished: false },
  session: {
    game_id: 'wordle',
    status: 'active',
    attempts_used: 0,
    max_attempts: 6,
    attempts: [],
    score: 0,
  },
  /** Con un intento hecho y sus tres pistas: es donde está la rejilla. */
  sessionConIntento: {
    game_id: 'wordle',
    status: 'active',
    attempts_used: 1,
    max_attempts: 6,
    attempts: [
      {
        attempt_number: 1,
        guess: 'NUBES',
        feedback: ['absent', 'present', 'correct', 'absent', 'present'],
        solved: false,
        score: 0,
      },
    ],
    score: 0,
  },
  /** Con la partida ya jugada: la pantalla tiene que mostrar el resultado. */
  sessionTerminada: {
    game_id: 'wordle',
    status: 'finished',
    attempts_used: 6,
    max_attempts: 6,
    attempts: [],
    score: 0,
  },
}

/** Contenido y sesión del acertijo. */
export const RIDDLE = {
  content: { question: 'Tengo ciudades, pero no casas. ¿Qué soy?' },
  session: { game_id: 'riddle', status: 'active', attempts_used: 0, solved: false, score: 0 },
  sessionFallado: { game_id: 'riddle', status: 'active', attempts_used: 2, solved: false, score: 0 },
  sessionAcierto: { game_id: 'riddle', status: 'finished', attempts_used: 3, solved: true, score: 10 },
}

/**
 * Intercepta la API de los juegos con un estado concreto.
 *
 * `overrides` va por ruta: `{ '/games/paraulogic/session': {...} }`. Se escribe
 * así, y no con una función, para que cada test de la suite diga en la llamada
 * qué estado está montando y no haya que leer dentro de un closure para saberlo.
 *
 * El orden de los `route` importa: Playwright evalúa **el último registrado
 * primero**, así que las rutas concretas (`/games/wordle/session`) se registran
 * antes que las generales (`/games/wordle`) que si no se comerían a las
 * primeras.
 */
export async function stubGames(page, overrides = {}) {
  const body = (key) => overrides[key]

  // --- Paraulógic ---
  await page.route('**/api/games/paraulogic/session', (route) =>
    route.fulfill({ json: body('/games/paraulogic/session') ?? PARAULOGIC.session }),
  )
  await page.route('**/api/games/paraulogic/hint', (route) =>
    route.fulfill({
      json:
        body('/games/paraulogic/hint') ?? {
          hint_text: 'Empieza por T',
          word_length: 5,
          is_common: false,
        },
    }),
  )
  await page.route('**/api/games/paraulogic/attempt', (route) =>
    route.fulfill({
      status: 201,
      json: body('/games/paraulogic/attempt') ?? { is_correct: false, score: 0 },
    }),
  )
  await page.route('**/api/games/paraulogic', (route) =>
    route.fulfill({ json: body('/games/paraulogic') ?? PARAULOGIC.content }),
  )

  // --- Wordle ---
  await page.route('**/api/games/wordle/session', (route) =>
    route.fulfill({ json: body('/games/wordle/session') ?? WORDLE.session }),
  )
  await page.route('**/api/games/wordle/attempt', (route) =>
    route.fulfill({
      status: 201,
      json:
        body('/games/wordle/attempt') ?? {
          attempt_number: 1,
          guess: 'NUBES',
          feedback: ['absent', 'present', 'correct', 'absent', 'present'],
          solved: false,
          score: 0,
        },
    }),
  )
  await page.route('**/api/games/wordle', (route) =>
    route.fulfill({ json: body('/games/wordle') ?? WORDLE.content }),
  )

  // --- Acertijo ---
  await page.route('**/api/games/riddle/session', (route) =>
    route.fulfill({ json: body('/games/riddle/session') ?? RIDDLE.session }),
  )
  await page.route('**/api/games/riddle/report', (route) =>
    route.fulfill({
      status: 201,
      json:
        body('/games/riddle/report') ?? {
          report_id: 1,
          given_answer: 'el mundo',
          gave_points: false,
          message: 'Guardado.',
        },
    }),
  )
  await page.route('**/api/games/riddle/answer', (route) =>
    route.fulfill({
      json: body('/games/riddle/answer') ?? { is_correct: false, attempts_used: 1 },
    }),
  )
  await page.route('**/api/games/riddle', (route) =>
    route.fulfill({ json: body('/games/riddle') ?? RIDDLE.content }),
  )

  // El catálogo, con `played` y `score` (spec 006 · R-018). Va al final: `**/api/games`
  // es el patrón más general de todos y se quedaría con la petición del catálogo.
  await page.route('**/api/games', (route) =>
    route.fulfill({ json: body('/api/games') ?? API_RESPONSES.games }),
  )

  // Salir de la partida (R-015). Sin esto, el botón dejaría la pantalla en
  // error en cualquier test que lo pulse.
  await page.route('**/api/games/*/abandon', (route) => {
    const gameId = route.request().url().split('/games/')[1].split('/')[0]
    const gaveUp = gameId === 'wordle'

    return route.fulfill({
      json: { game_id: gameId, gave_up: gaveUp, message: 'Has salido de la partida.' },
    })
  })
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
