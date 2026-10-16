/**
 * Cliente de la API (R-013, §3.2, §2.5).
 *
 * Reglas del archivo, y por qué:
 *
 * · **Los datos que llegan se validan antes de usarse.** En el servidor el
 *   tipado es fuerte; aquí no, y la constitución es explícita: nada de confianza
 *   ciega. Si la forma no cuadra, se lanza un error con un mensaje entendible y
 *   la pantalla lo enseña. Nunca se renderiza a medias.
 * · **Los mensajes de error del servidor se muestran tal cual.** El backend ya
 *   los escribe en español llano. Traducirlos aquí crearía dos textos que
 *   divergen, y el que se enseña acabaría siendo el que nadie revisa.
 * · **Nunca se enseña un código técnico.** Un 500 es un `ApiError` con un
 *   mensaje para la persona; el número se queda en la consola del servidor.
 * · **`credentials: 'include'`** en todo: la sesión va en cookie (`HttpOnly`),
 *   y sin esto el frontend no se enteraría de quién está dentro (spec 003).
 */

import { es } from '../i18n/es.js'
import {
  ApiError,
  parseAbandon,
  parseApiError,
  parseChatLimits,
  parseChatMessage,
  parseChatMessages,
  parseGameList,
  parseHealth,
  parseHint,
  parseLeaderboard,
  parseParaulogicAttempt,
  parseParaulogicContent,
  parseRiddleCheck,
  parseRiddleContent,
  parseRiddleReport,
  parseSessionState,
  parseUser,
  parseWordleAttempt,
  parseWordleContent,
} from './validators.js'

export { ApiError }

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

/**
 * Mensajes que usa el cliente.
 *
 * Vienen del diccionario (`i18n/es.js`) y se le pasan a los validadores como
 * parámetro, no se importan aquí: los validadores son lógica pura y probarlos no
 * debería depender de que haya un diccionario cargado (R-007).
 */
const MESSAGES = {
  network: es.errors.network,
  unexpectedResponse: es.errors.unexpectedResponse,
  contentUnexpected: es.errors.contentUnexpected,
  formUnexpected: es.errors.formUnexpected,
  chatUnavailable: es.errors.chatUnavailable,
  messageRejected: es.errors.messageRejected,
  gameUnexpected: es.errors.gameUnexpected,
}

/**
 * Hace la petición y devuelve el cuerpo ya validado.
 *
 * Un mismo sitio para toda llamada: si cada endpoint escribiera su propio
 * `fetch`, el manejo de errores acabaría siendo cinco versiones distintas del
 * mismo problema, y la que se olvidara de mirar el código HTTP sería la que
 * rompe la pantalla.
 */
async function request(path, { method = 'GET', parse, fallbackMessage, signal, body } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    // `fetch` solo falla por red: servidor caído, sin conexión, pestaña cerrada.
    // Es el caso que ve la persona, así que el mensaje es para ella (R-009).
    if (error.name === 'AbortError') throw error

    throw new ApiError(fallbackMessage ?? MESSAGES.network)
  }

  // El cuerpo se lee una sola vez, y con margen: un 503 del servidor de salud
  // viene con cuerpo válido y explica qué pasa. Un 502 de un proxy, en cambio,
  // puede venir con HTML, y eso hay que rechazarlo en lugar de mostrarlo.
  const payload = await readJson(response)

  if (!response.ok) {
    // El mensaje del servidor si lo hay; si no, uno genérico en lenguaje llano.
    throw new ApiError(parseApiError(payload, fallbackMessage ?? MESSAGES.unexpectedResponse))
  }

  return parse ? parse(payload, MESSAGES) : payload
}

/** Lee el cuerpo como JSON sin reventar si no lo es. */
async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

/** Estado del servicio. Lo usa la portada para comprobar que todo responde. */
export function fetchHealth({ signal } = {}) {
  return request('/health', { parse: parseHealth, fallbackMessage: MESSAGES.network, signal })
}

/** La lista de juegos del catálogo. Se puede ver sin iniciar sesión (§2.4). */
export function fetchGames({ signal } = {}) {
  return request('/games', { parse: parseGameList, signal })
}

/** Crea una cuenta y devuelve `{ username, alias }`. */
export function registerAccount({ username, password, passwordConfirmation }, { signal } = {}) {
  return request('/auth/register', {
    method: 'POST',
    parse: parseUser,
    fallbackMessage: MESSAGES.formUnexpected,
    signal,
    body: {
      username,
      password,
      // El servidor espera este nombre, no `password_confirmation`.
      password_confirmation: passwordConfirmation,
    },
  })
}

/** Inicia sesión y devuelve `{ username, alias }`. */
export function loginAccount({ username, password }, { signal } = {}) {
  return request('/auth/login', {
    method: 'POST',
    parse: parseUser,
    fallbackMessage: MESSAGES.formUnexpected,
    signal,
    body: { username, password },
  })
}

/** Cierra sesión. */
export function signOutAccount({ signal } = {}) {
  return request('/auth/logout', {
    method: 'POST',
    fallbackMessage: MESSAGES.formUnexpected,
    signal,
  })
}

/**
 * Quién está dentro, o `null` si no hay nadie.
 *
 * Un 401 aquí **no** es un error: es la respuesta normal de quien no ha
 * iniciado sesión, y por eso se distingue del resto de fallos. Si se tratara
 * como error, la portada enseñaría un mensaje rojo a alguien que solo quería
 * mirar la lista de juegos (§2.4, modo espectador).
 */
export async function fetchCurrentUser({ signal } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}/auth/me`, {
      signal,
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error

    // Sin red no se puede saber si hay sesión. Se devuelve `null` y la interfaz
    // sigue funcionando: se ve la portada sin nombre de usuario, que es lo que
    // puede hacer un modo espectador (R-013).
    return null
  }

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new ApiError(MESSAGES.unexpectedResponse)
  }

  return parseUser(await readJson(response), MESSAGES)
}

// --- Clasificación y chat (spec 007) -----------------------------------------


/**
 * La clasificación (R-001).
 *
 * Se consulta **sin sesión**: el modo espectador es el de quien todavía no tiene
 * cuenta y quiere ver que hay gente jugando (§2.4).
 *
 * `gameId` vacío significa la clasificación global acumulada; con un
 * identificador, la de ese juego.
 */
export function fetchLeaderboard({ gameId = '', limit, offset = 0, signal } = {}) {
  const query = new URLSearchParams()

  if (gameId) query.set('game_id', gameId)
  if (limit) query.set('limit', String(limit))
  if (offset > 0) query.set('offset', String(offset))

  const suffix = query.toString()

  return request(`/leaderboard${suffix === '' ? '' : `?${suffix}`}`, {
    parse: parseLeaderboard,
    signal,
  })
}

/**
 * Los mensajes nuevos desde la última consulta (R-003).
 *
 * `since` es la marca que devolvió la llamada anterior. **Se manda tal cual**,
 * sin convertirla: si el cliente la reinterpretara, el polling iría perdiendo
 * mensajes en algún momento y se vería como «a veces no llegan».
 */
export function fetchChatMessages({ since = '', signal } = {}) {
  const query = new URLSearchParams()

  if (since) query.set('since', since)

  const suffix = query.toString()

  return request(`/chat/messages${suffix === '' ? '' : `?${suffix}`}`, {
    parse: parseChatMessages,
    fallbackMessage: MESSAGES.chatUnavailable,
    signal,
  })
}

/**
 * Envía un mensaje y devuelve el que el servidor ha guardado (R-004).
 *
 * El texto plano lo comprueba el servidor: aquí solo se avisa de lo que él diga.
 * Ocultarlo en el cliente dejaría el problema abierto para quien llame a la API
 * directamente (§2.5).
 */
export function sendChatMessage({ body, signal } = {}) {
  return request('/chat/messages', {
    method: 'POST',
    parse: (payload, messages) => parseChatMessage(payload, messages),
    fallbackMessage: MESSAGES.messageRejected,
    signal,
    body: { body },
  })
}

/** Cuántos caracteres caben en un mensaje. */
export function fetchChatLimits({ signal } = {}) {
  return request('/chat/limits', { parse: parseChatLimits, signal })
}

/**
 * Bloquea o desbloquea a alguien (R-006).
 *
 * `204` sin cuerpo: no se espera nada en la respuesta, y el servidor no manda
 * inventos para llenar el hueco.
 */
export function setBlocked({ userId, blocked, signal } = {}) {
  return request(`/users/${userId}/block`, {
    method: blocked ? 'POST' : 'DELETE',
    fallbackMessage: MESSAGES.unexpectedResponse,
    signal,
  })
}

/** Borra la cuenta y todo lo que pertenece a esa persona (R-010). */
export function deleteAccount({ signal } = {}) {
  return request('/auth/me', {
    method: 'DELETE',
    fallbackMessage: MESSAGES.formUnexpected,
    signal,
  })
}

// --- Los tres juegos (spec 006 · R-014, R-015, R-017) -----------------------

/**
 * Contenido de Paraulógic: las letras y cuántas palabras faltan.
 *
 * **No lleva sesión.** Las letras son públicas (§2.1.2) y así se puede ver el
 * juego sin entrar; lo que necesita cuenta es la partida, no el rompecabezas.
 */
export function fetchParaulogicContent({ signal } = {}) {
  return request('/games/paraulogic', { parse: parseParaulogicContent, signal })
}

/** El progreso guardado de quien está jugando (R-014, §2.1.7). */
export function fetchParaulogicSession({ signal } = {}) {
  return request('/games/paraulogic/session', { parse: parseSessionState, signal })
}

/** Comprueba una palabra. La respuesta decide si es correcta (§6.6). */
export function submitParaulogicWord({ word, signal } = {}) {
  return request('/games/paraulogic/attempt', {
    method: 'POST',
    parse: parseParaulogicAttempt,
    fallbackMessage: MESSAGES.gameUnexpected,
    signal,
    body: { word },
  })
}

/** Una pista. No resta puntos y aquí no se guarda nada (§2.1.5). */
export function fetchParaulogicHint({ signal } = {}) {
  return request('/games/paraulogic/hint', { parse: parseHint, signal })
}

/** La palabra de Wordle. Sale `null` si la partida ya se jugó (§2.1.4). */
export function fetchWordleContent({ signal } = {}) {
  return request('/games/wordle', { parse: parseWordleContent, signal })
}

/** Los intentos ya hechos de Wordle, con su pista de tres letras. */
export function fetchWordleSession({ signal } = {}) {
  return request('/games/wordle/session', { parse: parseSessionState, signal })
}

/** Comprueba un intento y devuelve la pista de cada letra (§2.1.4). */
export function submitWordleAttempt({ guess, signal } = {}) {
  return request('/games/wordle/attempt', {
    method: 'POST',
    parse: parseWordleAttempt,
    fallbackMessage: MESSAGES.gameUnexpected,
    signal,
    body: { guess },
  })
}

/** El enunciado del acertijo. Nunca la respuesta (§2.1.2). */
export function fetchRiddleContent({ signal } = {}) {
  return request('/games/riddle', { parse: parseRiddleContent, signal })
}

/** El estado del acertijo: si ya se acertó y cuántos intentos hubo. */
export function fetchRiddleSession({ signal } = {}) {
  return request('/games/riddle/session', { parse: parseSessionState, signal })
}

/** Comprueba una respuesta. La comparación se hace en el servidor (§2.1.2). */
export function submitRiddleAnswer({ answer, signal } = {}) {
  return request('/games/riddle/answer', {
    method: 'POST',
    parse: parseRiddleCheck,
    fallbackMessage: MESSAGES.gameUnexpected,
    signal,
    body: { answer },
  })
}

/** Registra una respuesta rechazada que la persona cree correcta (R-017). */
export function reportRiddleAnswer({ givenAnswer, signal } = {}) {
  return request('/games/riddle/report', {
    method: 'POST',
    parse: parseRiddleReport,
    fallbackMessage: MESSAGES.gameUnexpected,
    signal,
    body: { given_answer: givenAnswer },
  })
}

/**
 * Sale de la partida (R-015).
 *
 * **Un solo paso, sin confirmación**, y en Wordle avisa antes. `gave_up` dice si
 * la partida se ha gastado de verdad: quien lo ignore enseñaría un teclado que
 * ya no sirve (§4.2).
 */
export function abandonGame({ gameId, signal } = {}) {
  return request(`/games/${gameId}/abandon`, {
    method: 'POST',
    parse: parseAbandon,
    fallbackMessage: MESSAGES.gameUnexpected,
    signal,
  })
}
