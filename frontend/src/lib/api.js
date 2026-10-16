/**
 * Cliente de la API.
 *
 * En el servidor el tipado es fuerte (Pydantic). En el cliente no hay tipado
 * estático, así que lo que llega de la API se valida en tiempo de ejecución
 * antes de usarse (§3.2). Si la forma no es la esperada, se lanza un error con
 * un mensaje entendible y la pantalla lo muestra; nunca se renderiza a medias.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Valida que `value` sea un objeto plano. */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Comprueba la forma de la respuesta de salud.
 *
 * Se validan los campos, no el objeto entero: el servidor puede añadir campos
 * nuevos sin romper el cliente, pero si falta o cambia de tipo alguno de estos,
 * hay que enterarse en vez de pintar `undefined`.
 */
function parseHealth(payload) {
  if (!isPlainObject(payload)) {
    throw new ApiError('La respuesta del servidor no tiene el formato esperado.')
  }

  const { status, database } = payload

  if (status !== 'ok' && status !== 'degraded') {
    throw new ApiError('La respuesta del servidor no tiene el formato esperado.')
  }

  if (database !== 'connected' && database !== 'unreachable') {
    throw new ApiError('La respuesta del servidor no tiene el formato esperado.')
  }

  return { status, database }
}

/**
 * Consulta el estado del servicio.
 *
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ status: 'ok' | 'degraded', database: 'connected' | 'unreachable' }>}
 */
export async function fetchHealth({ signal } = {}) {
  let response

  try {
    response = await fetch(`${BASE_URL}/health`, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    // fetch solo falla por red (servidor caído, sin conexión). Es el caso que
    // ve el usuario, así que el mensaje es de usuario, no técnico.
    if (error.name === 'AbortError') throw error
    throw new ApiError('No se pudo contactar con el servidor.')
  }

  if (!response.ok) {
    // Un 503 es el caso esperado cuando la base de datos no responde: el
    // cuerpo sigue siendo válido y hay que leerlo para explicarlo bien.
    if (response.status !== 503) {
      throw new ApiError('El servidor ha devuelto un error inesperado.')
    }
  }

  return parseHealth(await response.json())
}