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
  parseApiError,
  parseGameList,
  parseHealth,
  parseUser,
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
