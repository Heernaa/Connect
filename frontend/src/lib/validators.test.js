// @vitest-environment node

/**
 * Validación en tiempo de ejecución de lo que llega de la API (R-013, §3.2).
 *
 * Estos tests comprueban lo que la constitution pide de forma expresa: en el
 * cliente no hay confianza ciega. Se prueban los casos que de verdad rompen una
 * pantalla —un `null`, un array donde tocaba un objeto, un número que llega como
 * texto— y se comprueba que el error dice algo que una persona pueda entender.
 */

import { describe, expect, it } from 'vitest'

import { es } from '../i18n/es.js'
import {
  parseApiError,
  parseGameList,
  parseGameSummary,
  parseHealth,
  parseUser,
} from './validators.js'

const MESSAGES = {
  network: es.errors.network,
  unexpectedResponse: es.errors.unexpectedResponse,
  contentUnexpected: es.errors.contentUnexpected,
  formUnexpected: es.errors.formUnexpected,
}

describe('validadores de la API (R-013)', () => {
  describe('parseHealth', () => {
    it('devuelve el estado cuando la forma es la esperada', () => {
      expect(parseHealth({ status: 'ok', database: 'connected' }, MESSAGES)).toEqual({
        status: 'ok',
        database: 'connected',
      })
    })

    it('admite campos que el servidor añada en el futuro', () => {
      // El servidor puede enviar más cosas de las que el cliente usa. Romper
      // aquí sería tirar la espalda de una mejora del servidor.
      const parsed = parseHealth(
        { status: 'degraded', database: 'unreachable', uptimeSeconds: 12 },
        MESSAGES,
      )

      expect(parsed).toEqual({ status: 'degraded', database: 'unreachable' })
    })

    it.each([
      ['null', null],
      ['un array', []],
      ['una cadena', 'ok'],
      ['un estado desconocido', { status: 'exploded', database: 'connected' }],
      ['una base de datos desconocida', { status: 'ok', database: 'maybe' }],
      ['un estado que falta', { database: 'connected' }],
      ['un número donde va texto', { status: 200, database: 'connected' }],
    ])('rechaza %s', (_label, payload) => {
      // Lo importante es que lanza y que el mensaje no es técnico: es lo que
      // acabará en pantalla (R-009).
      expect(() => parseHealth(payload, MESSAGES)).toThrow(MESSAGES.unexpectedResponse)
    })
  })

  describe('parseGameSummary', () => {
    it('convierte las claves del servidor a las del cliente', () => {
      // El servidor habla en `snake_case` y el cliente en `camelCase`. La
      // traducción ocurre aquí, en un solo sitio, en lugar de en cada
      // componente.
      const parsed = parseGameSummary(
        { game_id: 'wordle', name: 'Wordle', description: 'Adivina la palabra.' },
        MESSAGES,
      )

      expect(parsed).toEqual({ gameId: 'wordle', name: 'Wordle', description: 'Adivina la palabra.' })
    })

    it.each([
      ['sin nombre', { game_id: 'wordle', description: 'x' }],
      ['con nombre vacío', { game_id: 'wordle', name: '   ', description: 'x' }],
      ['sin identificador', { name: 'Wordle', description: 'x' }],
      ['con la descripción como número', { game_id: 'w', name: 'W', description: 42 }],
    ])('rechaza un juego %s', (_label, payload) => {
      expect(() => parseGameSummary(payload, MESSAGES)).toThrow(MESSAGES.contentUnexpected)
    })
  })

  describe('parseGameList', () => {
    it('devuelve la lista completa', () => {
      const parsed = parseGameList(
        [
          { game_id: 'wordle', name: 'Wordle', description: 'a' },
          { game_id: 'paraulogic', name: 'Paraulógic', description: 'b' },
        ],
        MESSAGES,
      )

      expect(parsed).toHaveLength(2)
      expect(parsed[1].gameId).toBe('paraulogic')
    })

    it('admite una lista vacía', () => {
      // Catálogo vacío es un caso válido: el servidor puede no tener juegos
      // cargados todavía, y eso lo dice la pantalla, no es un fallo de forma.
      expect(parseGameList([], MESSAGES)).toEqual([])
    })

    it.each([
      ['un objeto donde toca una lista', { games: [] }],
      ['null', null],
      ['una lista con un elemento roto', [{ name: 'Wordle' }]],
    ])('rechaza %s', (_label, payload) => {
      expect(() => parseGameList(payload, MESSAGES)).toThrow(MESSAGES.contentUnexpected)
    })
  })

  describe('parseUser', () => {
    it('devuelve el nombre y el alias', () => {
      expect(parseUser({ username: 'ana', alias: 'LoboTranquilo' }, MESSAGES)).toEqual({
        username: 'ana',
        alias: 'LoboTranquilo',
      })
    })

    it('rechaza una cuenta sin alias', () => {
      // El alias es identidad anónima de la persona (§2.2). Si no llega, la
      // pantalla no puede enseñarlo: es un fallo de forma, no algo que se
      // improvise con un texto vacío.
      expect(() => parseUser({ username: 'ana' }, MESSAGES)).toThrow(MESSAGES.unexpectedResponse)
    })
  })

  describe('parseApiError', () => {
    it('devuelve el mensaje del servidor tal cual', () => {
      // El backend ya escribe los mensajes en español llano. Traducirlos aquí
      // crearía dos textos que divergen, y el que se enseña acabaría siendo el
      // que nadie revisa (§4.1).
      const message = 'Ese nombre de usuario ya está en uso. Prueba con otro.'

      expect(parseApiError({ message }, 'genérico')).toBe(message)
    })

    it.each([
      ['sin cuerpo', null],
      ['con cuerpo vacío', {}],
      ['con el mensaje vacío', { message: '  ' }],
      ['con el mensaje como número', { message: 500 }],
      ['con un error de otro formato', { detail: 'Not Found' }],
    ])('usa el mensaje genérico si el servidor manda %s', (_label, payload) => {
      // Un 502 de un proxy puede venir con HTML o con otro formato. Enseñar eso
      // en pantalla es andamiaje técnico (§4.1).
      expect(parseApiError(payload, 'mensaje genérico')).toBe('mensaje genérico')
    })
  })
})
