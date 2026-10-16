import { describe, expect, it } from 'vitest'

import {
  ApiError,
  parseChatLimits,
  parseChatMessage,
  parseChatMessages,
  parseLeaderboard,
  parseLeaderboardEntry,
} from './validators.js'

/**
 * Validación de lo que llega de la API (R-013, §3.2).
 *
 * Aquí no se prueba que el servidor mande bien —eso se prueba en el backend—,
 * sino que **el cliente no se rompe si el servidor manda otra cosa**. Un campo
 * que falta o que cambia de tipo tiene que acabar en un mensaje claro, nunca en
 * un `undefined` pintado en pantalla (R-009).
 */

const MESSAGES = {
  contentUnexpected: 'La información del juego no se ha podido leer.',
  unexpectedResponse: 'El servidor ha devuelto una respuesta que no se entiende.',
}

describe('la clasificación', () => {
  it('acepta una fila bien formada', () => {
    const fila = parseLeaderboardEntry(
      { alias: 'LoboTranquilo', points: 21, game_id: 'paraulogic' },
      MESSAGES,
    )

    expect(fila).toEqual({ alias: 'LoboTranquilo', points: 21, gameId: 'paraulogic' })
  })

  it('acepta `game_id` nulo en la clasificación global', () => {
    // No es un campo que falte: es lo que significa «estos puntos son de todos
    // los juegos juntos». Un `null` aquí es un valor legítimo.
    const fila = parseLeaderboardEntry({ alias: 'A', points: 5, game_id: null }, MESSAGES)

    expect(fila.gameId).toBeNull()
  })

  it('rechaza un alias que no es texto', () => {
    expect(() => parseLeaderboardEntry({ alias: 42, points: 1 }, MESSAGES)).toThrow(ApiError)
  })

  it('rechaza puntos que no son un número', () => {
    // Un `points: "muchos"` pintaría texto donde va una cifra, y el `null` de
    // un JSON malformado pintaría «null puntos».
    expect(() => parseLeaderboardEntry({ alias: 'A', points: 'muchos' }, MESSAGES)).toThrow(ApiError)
  })

  it('acepta cero puntos', () => {
    // Cero es un número válido. Si se rechazara, una fila recién creada no
    // podría mostrarse nunca.
    const fila = parseLeaderboardEntry({ alias: 'A', points: 0 }, MESSAGES)

    expect(fila.points).toBe(0)
  })

  it('lee la lista completa con su total', () => {
    const resultado = parseLeaderboard(
      {
        entries: [
          { alias: 'A', points: 10, game_id: null },
          { alias: 'B', points: 5, game_id: null },
        ],
        total: 2,
        has_more: false,
      },
      MESSAGES,
    )

    expect(resultado.entries).toHaveLength(2)
    expect(resultado.total).toBe(2)
    expect(resultado.hasMore).toBe(false)
  })

  it('rechaza una respuesta que no es una lista', () => {
    // Si `entries` fuera un objeto en lugar de un array, `.map` reventaría el
    // render entero: pantalla en blanco.
    expect(() => parseLeaderboard({ entries: { alias: 'A' } }, MESSAGES)).toThrow(ApiError)
  })
})

describe('un mensaje del chat', () => {
  const mensaje = {
    message_id: 7,
    author_id: 3,
    alias: 'ArdillaViva',
    body: 'Buenos días',
    kind: 'user',
    created_at: '2026-10-16T12:00:00Z',
    is_mine: false,
  }

  it('acepta un mensaje bien formado', () => {
    const resultado = parseChatMessage(mensaje, MESSAGES)

    expect(resultado).toEqual({
      messageId: 7,
      authorId: 3,
      alias: 'ArdillaViva',
      body: 'Buenos días',
      kind: 'user',
      createdAt: '2026-10-16T12:00:00Z',
      isMine: false,
    })
  })

  it('acepta un mensaje del sistema sin alias ni autor', () => {
    // Los del sistema no tienen autor: por eso `alias` y `author_id` pueden ser
    // `null`. Sin esto, no se podrían distinguir de un mensaje roto.
    const sistema = parseChatMessage(
      { ...mensaje, alias: null, author_id: null, kind: 'system' },
      MESSAGES,
    )

    expect(sistema.alias).toBeNull()
    expect(sistema.kind).toBe('system')
  })

  it('rechaza un tipo de mensaje desconocido', () => {
    // Si mañana apareciera un tipo nuevo, se pintaría con el estilo de un
    // mensaje normal y alguien podría hacerse pasar por el sistema (§6.4).
    expect(() => parseChatMessage({ ...mensaje, kind: 'admin' }, MESSAGES)).toThrow(ApiError)
  })

  it('rechaza una fecha que no se entiende', () => {
    // Sin esta comprobación, `new Date('lo que sea')` daría `Invalid Date` y
    // ese texto acabaría en pantalla (R-009).
    expect(() => parseChatMessage({ ...mensaje, created_at: 'ayer' }, MESSAGES)).toThrow(ApiError)
  })

  it('rechaza un texto vacío', () => {
    expect(() => parseChatMessage({ ...mensaje, body: '   ' }, MESSAGES)).toThrow(ApiError)
  })

  it('devuelve la marca de tiempo tal cual, sin convertirla', () => {
    // El cliente la reenvía en la siguiente consulta. Convertirla aquí sería
    // una forma de que se degrade una vez (R-003).
    const resultado = parseChatMessages(
      { messages: [mensaje], poll_from: '2026-10-16T12:00:00.123456+00:00' },
      MESSAGES,
    )

    expect(resultado.pollFrom).toBe('2026-10-16T12:00:00.123456+00:00')
  })

  it('rechaza una respuesta sin lista de mensajes', () => {
    expect(() => parseChatMessages({ poll_from: '2026-10-16T12:00:00Z' }, MESSAGES)).toThrow(
      ApiError,
    )
  })
})

describe('los límites del mensaje', () => {
  it('lee el límite del servidor', () => {
    // El límite es del servidor (§2.4). Si estuviera escrito en el cliente,
    // cambiarlo en el backend no lo cambiaría en la pantalla y el contador
    // mentiría sin que nadie se entere.
    expect(parseChatLimits({ max_length: 500 }, MESSAGES).maxLength).toBe(500)
  })

  it('rechaza una respuesta sin el número', () => {
    expect(() => parseChatLimits({}, MESSAGES)).toThrow(ApiError)
  })
})