/**
 * Validadores de la respuesta de la API (R-013, §3.2).
 *
 * En el servidor el tipado es fuerte: cada respuesta tiene su modelo de
 * Pydantic y está comprobado antes de salir. En el cliente no hay tipado
 * estático, así que aquí se comprueba **la forma** de lo que llega antes de
 * usarlo para pintar nada.
 *
 * Por qué no es paranoia:
 *
 * · El servidor puede añadir o renombrar un campo. Si el cliente lo usa sin
 *   mirar, pinta `undefined` en pantalla — que es exactamente lo que R-009
 *   prohíbe.
 * · Un `null` inesperado, un array donde se esperaba un objeto o un número
 *   donde iba un texto rompen el render entero: pantalla en blanco y un error
 *   en la consola que nadie leerá.
 * · Comprobar los campos que **usa** el cliente, y no el objeto entero,
 *   permite que el servidor siga añadiendo información sin romper aquí.
 *
 * Los validadores devuelven un objeto limpio y tipado por lo que se usa. Si
 * algo no cuadra, lanzan `ApiError` con un mensaje en lenguaje llano (R-009).
 */

/** Error con un mensaje pensado para quien lo va a leer, no para un registro. */
export class ApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Valida que el valor sea un objeto plano, ni `null` ni array. */
export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Valida que el valor sea un texto no vacío. */
function requireText(value, field, message) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(message)
  }

  return value
}

/**
 * Estado del servidor: `{ status, database }`.
 *
 * Se comprueba contra la lista de valores que el servidor puede enviar. Si
 * mañana aparece un estado nuevo, se avisa con un mensaje claro en lugar de
 * pintar un estado que nadie ha visto redactado.
 */
export function parseHealth(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.unexpectedResponse)
  }

  const { status, database } = payload

  if (status !== 'ok' && status !== 'degraded') {
    throw new ApiError(messages.unexpectedResponse)
  }

  if (database !== 'connected' && database !== 'unreachable') {
    throw new ApiError(messages.unexpectedResponse)
  }

  return { status, database }
}

/** Un juego del catálogo: `{ gameId, name, description }`. */
export function parseGameSummary(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    gameId: requireText(payload.game_id, 'game_id', messages.contentUnexpected),
    name: requireText(payload.name, 'name', messages.contentUnexpected),
    description: requireText(payload.description, 'description', messages.contentUnexpected),
  }
}

/** La lista de juegos del catálogo. */
export function parseGameList(payload, messages) {
  if (!Array.isArray(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return payload.map((item) => parseGameSummary(item, messages))
}

/** Una cuenta: `{ username, alias }`. */
export function parseUser(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.unexpectedResponse)
  }

  return {
    username: requireText(payload.username, 'username', messages.unexpectedResponse),
    alias: requireText(payload.alias, 'alias', messages.unexpectedResponse),
  }
}

/**
 * Un error del servidor.
 *
 * El backend devuelve siempre `{ "message": "..." }` con el mensaje ya redactado
 * en español llano (`backend/app/errors.py`). Se enseña **tal cual**: traducirlo
 * otra vez en el cliente significaría mantener dos versiones del mismo texto, y
 * la que se enseña casi siempre sería la que nadie revisa.
 *
 * Si el mensaje falta o no es un texto —un 500 sin cuerpo, un proxy que
 * devuelve HTML—, se usa el genérico. Nunca se enseña el código HTTP ni la
 * respuesta cruda: eso es andamiaje técnico (§4.1).
 */
export function parseApiError(payload, fallbackMessage) {
  if (isPlainObject(payload) && typeof payload.message === 'string' && payload.message.trim() !== '') {
    return payload.message
  }

  return fallbackMessage
}
