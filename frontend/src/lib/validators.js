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

/**
 * Un juego del catálogo: `{ game_id, name, description, played, score }`.
 *
 * `played` y `score` los añade la spec 006 · R-018. Sin sesión llegan como
 * `false` y `0`, que es lo correcto: el estado de una partida es de la cuenta,
 * no del juego. Se validan igualmente, para que un cambio en el servidor no
 * acabe pintando un «nan» o un objeto donde va un número (R-013).
 */
export function parseGameSummary(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const score = payload.score

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    gameId: requireText(payload.game_id, 'game_id', messages.contentUnexpected),
    name: requireText(payload.name, 'name', messages.contentUnexpected),
    description: requireText(payload.description, 'description', messages.contentUnexpected),
    played: payload.played === true,
    score,
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

/** Una marca de tiempo en ISO 8601, como la devuelve el servidor. */
function requireTimestamp(value, field, message) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ApiError(message)
  }

  const parsed = Date.parse(value)

  // Un texto que no es una fecha se cuela más de lo que parece: un `null`
  // serializado, o un número de epoch donde se esperaba texto. Comprobarlo es lo
  // que impide enseñar «Invalid Date» en pantalla (R-009).
  if (Number.isNaN(parsed)) {
    throw new ApiError(message)
  }

  return value
}

/** Una fila de la clasificación: `{ alias, points, game_id }`. */
export function parseLeaderboardEntry(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const points = payload.points

  if (typeof points !== 'number' || !Number.isFinite(points)) {
    throw new ApiError(messages.contentUnexpected)
  }

  // `game_id` puede venir `null` en la vista global —esos puntos son la suma de
  // todos los juegos— o no venir, si mañana el servidor deja de enviarlo. Los dos
  // casos significan lo mismo y se normalizan a `null`.
  //
  // No se usa `?? null` a secas: convierte también un `0` o un `""` en `null`,
  // y eso taparía un servidor que mandara cualquier cosa en ese campo. Solo se
  // acepta que falte o que sea `null`; cualquier otro valor se rechaza (R-013).
  const gameId = payload.game_id === undefined ? null : payload.game_id

  if (gameId !== null && typeof gameId !== 'string') {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    alias: requireText(payload.alias, 'alias', messages.contentUnexpected),
    points,
    gameId,
  }
}

/** La clasificación: `{ entries, total, has_more }`. */
export function parseLeaderboard(payload, messages) {
  if (!isPlainObject(payload) || !Array.isArray(payload.entries)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    entries: payload.entries.map((entry) => parseLeaderboardEntry(entry, messages)),
    total: typeof payload.total === 'number' ? payload.total : payload.entries.length,
    hasMore: payload.has_more === true,
  }
}

/** Un mensaje del chat. */
export function parseChatMessage(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  // El alias puede ser `null`: son los mensajes del sistema, que no tienen
  // autor. Lo que no puede ser es un número o un objeto, porque entonces la
  // pantalla pintaría algo que no es un alias (R-009).
  const alias = payload.alias

  if (alias !== null && typeof alias !== 'string') {
    throw new ApiError(messages.contentUnexpected)
  }

  const kind = payload.kind

  if (kind !== 'user' && kind !== 'system') {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    messageId: typeof payload.message_id === 'number' ? payload.message_id : 0,
    // `author_id` es `null` en los mensajes del sistema. Se normaliza igual que
    // `game_id`: ausente y `null` significan lo mismo, y sin esa normalización
    // el botón de bloquear compararía contra `undefined`.
    authorId: typeof payload.author_id === 'number' ? payload.author_id : null,
    alias,
    body: requireText(payload.body, 'body', messages.contentUnexpected),
    kind,
    createdAt: requireTimestamp(payload.created_at, 'created_at', messages.contentUnexpected),
    isMine: payload.is_mine === true,
  }
}

/** Los mensajes nuevos y la marca de la próxima consulta. */
export function parseChatMessages(payload, messages) {
  if (!isPlainObject(payload) || !Array.isArray(payload.messages)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    messages: payload.messages.map((message) => parseChatMessage(message, messages)),
    // La marca es la cadena tal cual, sin convertir: se reenvía en la siguiente
    // consulta y convertirla aquí sería una forma de que se degrade una vez
    // (R-003).
    pollFrom: requireTimestamp(payload.poll_from, 'poll_from', messages.contentUnexpected),
  }
}

/** Los límites del mensaje. */
export function parseChatLimits(payload, messages) {
  if (!isPlainObject(payload) || typeof payload.max_length !== 'number') {
    throw new ApiError(messages.contentUnexpected)
  }

  return { maxLength: payload.max_length }
}

/*
 * Los juegos (spec 006 · R-014).
 *
 * El mismo criterio que en el resto del archivo: se comprueba **la forma** de lo
 * que llega antes de usarlo para pintar. Aquí importa más que en ningún otro sitio
 * por una razón concreta: `GET /api/games/wordle` devuelve `word: null` cuando
 * la partida ya está jugada, y `pending_count` es `0` cuando no falta nada. Si
 * `null` y `0` se trataran como «falta el dato», la pantalla enseñaría
 * «Cargando…» para siempre justo en los dos casos en los que el juego ya ha
 * terminado.
 */

/** Contenido de Paraulógic: `{ letters, pending_count }`. */
export function parseParaulogicContent(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const pending = payload.pending_count

  if (typeof pending !== 'number' || !Number.isFinite(pending)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    // `letters` es el conjunto de letras del puzzle. Si viniera vacío no se
    // puede jugar, y eso es un fallo del servidor, no una partida terminada.
    letters: requireText(payload.letters, 'letters', messages.contentUnexpected),
    pendingCount: pending,
  }
}

/** El estado de una partida: el mismo modelo para los tres juegos. */
export function parseSessionState(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const attempts = Array.isArray(payload.attempts) ? payload.attempts : []
  const foundWords = Array.isArray(payload.found_words) ? payload.found_words : []

  return {
    gameId: requireText(payload.game_id, 'game_id', messages.contentUnexpected),
    // Los tres estados que el servidor puede enviar. Un cuarto estado —por
    // ejemplo `lost`— sería un estado que el producto no tiene (§2.1.4) y la
    // pantalla no sabría pintarlo.
    status: ['active', 'finished', 'abandoned'].includes(payload.status)
      ? payload.status
      : 'active',
    attemptsUsed: typeof payload.attempts_used === 'number' ? payload.attempts_used : 0,
    maxAttempts: typeof payload.max_attempts === 'number' ? payload.max_attempts : 6,
    attempts: attempts.map((attempt) => parseWordleAttempt(attempt, messages)),
    foundWords: foundWords.filter((word) => typeof word === 'string'),
    pendingCount: typeof payload.pending_count === 'number' ? payload.pending_count : 0,
    solved: payload.solved === true,
    score: typeof payload.score === 'number' ? payload.score : 0,
  }
}

/** Un intento de Wordle con su pista de tres letras. */
export function parseWordleAttempt(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const feedback = Array.isArray(payload.feedback) ? payload.feedback : []
  const allowed = ['correct', 'present', 'absent']

  // Una pista con un valor que no se reconoce es peor que no tener pista: la
  // casilla se pintaría sin estilo y sin texto, y sería un estado que nadie ha
  // visto redactado (§2.1.4).
  const valid = feedback.filter((value) => allowed.includes(value))

  return {
    attemptNumber: typeof payload.attempt_number === 'number' ? payload.attempt_number : 0,
    guess: requireText(payload.guess, 'guess', messages.contentUnexpected),
    feedback: valid,
    solved: payload.solved === true,
    score: typeof payload.score === 'number' ? payload.score : 0,
  }
}

/** Resultado de comprobar una palabra de Paraulógic. */
export function parseParaulogicAttempt(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    isCorrect: payload.is_correct === true,
    score: typeof payload.score === 'number' ? payload.score : 0,
    // `correct_word` solo viene cuando `is_correct` es `true`. Ausente o `null`
    // significan lo mismo y se normalizan igual, por el mismo motivo que
    // `game_id`: aceptar solo uno dejaría que un cambio del servidor rompiera
    // la pantalla sin avisar (R-013).
    correctWord: typeof payload.correct_word === 'string' ? payload.correct_word : null,
    foundWords: typeof payload.found_words === 'number' ? payload.found_words : 0,
  }
}

/** Una pista de Paraulógic. */
export function parseHint(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const length = payload.word_length

  if (typeof length !== 'number') {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    hintText: requireText(payload.hint_text, 'hint_text', messages.contentUnexpected),
    wordLength: length,
    isCommon: payload.is_common === true,
  }
}

/** La palabra de Wordle. `word` es `null` si la partida ya se jugó (R-014). */
export function parseWordleContent(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  const word = payload.word

  if (word !== null && typeof word !== 'string') {
    throw new ApiError(messages.contentUnexpected)
  }

  return { word, alreadyFinished: payload.already_finished === true }
}

/** El enunciado del acertijo. Nunca la respuesta (§2.1.2). */
export function parseRiddleContent(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    question: requireText(payload.question, 'question', messages.contentUnexpected),
  }
}

/** Resultado de comprobar una respuesta de acertijo. */
export function parseRiddleCheck(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    isCorrect: payload.is_correct === true,
    attemptsUsed: typeof payload.attempts_used === 'number' ? payload.attempts_used : 0,
  }
}

/** Salir de la partida: `{ game_id, gave_up, message }` (R-015). */
export function parseAbandon(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    gameId: requireText(payload.game_id, 'game_id', messages.contentUnexpected),
    // `gave_up` decide si la interfaz tiene que **dejar de pintar el juego**. En
    // Wordle significa que la única partida se ha gastado, y seguir enseñando el
    // teclado sería prometer algo que ya no existe (§4.2).
    gaveUp: payload.gave_up === true,
    message: requireText(payload.message, 'message', messages.contentUnexpected),
  }
}

/** Confirmación del reporte de acertijo (R-017). */
export function parseRiddleReport(payload, messages) {
  if (!isPlainObject(payload)) {
    throw new ApiError(messages.contentUnexpected)
  }

  return {
    reportId: typeof payload.report_id === 'number' ? payload.report_id : 0,
    givenAnswer: requireText(payload.given_answer, 'given_answer', messages.contentUnexpected),
    // El servidor lo afirma explícitamente. Se lee, no se deduce: si el campo
    // desapareciera, `false` seguiría siendo la respuesta conservadora, y eso
    // es lo que queremos para no prometer puntos que no se han dado.
    gavePoints: payload.gave_points === true,
    message: requireText(payload.message, 'message', messages.contentUnexpected),
  }
}
