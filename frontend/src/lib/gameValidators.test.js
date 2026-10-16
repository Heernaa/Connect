import { describe, expect, it } from 'vitest'

import {
  parseAbandon,
  parseGameSummary,
  parseHint,
  parseParaulogicAttempt,
  parseParaulogicContent,
  parseRiddleCheck,
  parseRiddleContent,
  parseRiddleReport,
  parseSessionState,
  parseWordleAttempt,
  parseWordleContent,
} from './validators.js'

/**
 * Validación de lo que llega de los juegos (spec 006 · R-014, y R-013).
 *
 * Aquí importa más que en ningún otro sitio por dos motivos concretos:
 *
 * · **`null` es un valor legítimo.** `GET /api/games/wordle` devuelve
 *   `word: null` cuando la partida ya se jugó, y Paraulógic devuelve
 *   `pending_count: 0` cuando no falta nada. Si `null` se tratara como «falta el
 *   dato», la pantalla se quedaría en «Cargando…» para siempre justo en los dos
 *   casos en los que el juego ya ha terminado.
 * · **El servidor decide, el cliente pinta** (§6.6). Si el validador acepta un
 *   tipo equivocado, el cliente acaba enseñando algo que nadie ha visto
 *   redactado: un `undefined` donde iba una letra.
 */

const MESSAGES = {
  contentUnexpected: 'La información del juego no se ha podido leer.',
  unexpectedResponse: 'El servidor ha devuelto una respuesta que no se entiende.',
}

describe('el catálogo de juegos', () => {
  it('lee played y score', () => {
    // R-018: el estado llega del servidor, no está escrito a mano.
    const game = parseGameSummary(
      { game_id: 'wordle', name: 'Wordle', description: '...', played: true, score: 100 },
      MESSAGES,
    )

    expect(game.played).toBe(true)
    expect(game.score).toBe(100)
  })

  it('acepta cero puntos y partida sin empezar', () => {
    // Sin sesión el servidor devuelve `false` y `0`. Cero es un valor real, no
    // «falta el dato»: rechazarlo dejaría la lista entera sin pintar.
    const game = parseGameSummary(
      { game_id: 'wordle', name: 'Wordle', description: '...', played: false, score: 0 },
      MESSAGES,
    )

    expect(game.score).toBe(0)
    expect(game.played).toBe(false)
  })

  it('rechaza puntos que no son un número', () => {
    expect(() =>
      parseGameSummary(
        { game_id: 'w', name: 'W', description: '...', played: false, score: 'muchos' },
        MESSAGES,
      ),
    ).toThrow()
  })
})

describe('Paraulógic', () => {
  it('lee las letras y cuántas faltan', () => {
    const content = parseParaulogicContent({ letters: 'AENRST', pending_count: 21 }, MESSAGES)

    expect(content).toEqual({ letters: 'AENRST', pendingCount: 21 })
  })

  it('acepta cero palabras pendientes', () => {
    // Es el estado de haberlo resuelto todo. Con `0` rechazado, la pantalla se
    // quedaría en «Cargando…» en el mejor momento de la partida.
    const content = parseParaulogicContent({ letters: 'AENRST', pending_count: 0 }, MESSAGES)

    expect(content.pendingCount).toBe(0)
  })

  it('rechaza un conjunto de letras vacío', () => {
    // Sin letras no se puede jugar, y eso es un fallo del servidor, no una
    // partida terminada.
    expect(() => parseParaulogicContent({ letters: '', pending_count: 5 }, MESSAGES)).toThrow()
  })

  it('lee un acierto con su palabra', () => {
    const result = parseParaulogicAttempt(
      { is_correct: true, score: 5, correct_word: 'LUNAS', found_words: 5 },
      MESSAGES,
    )

    expect(result).toEqual({
      isCorrect: true,
      score: 5,
      correctWord: 'LUNAS',
      foundWords: 5,
    })
  })

  it('normaliza a null la palabra ausente de un fallo', () => {
    // `correct_word` no viene cuando `is_correct` es `false`. Ausente y `null`
    // significan lo mismo, y tratarlos por separado dejaría que un cambio del
    // servidor rompiera la pantalla sin avisar.
    const result = parseParaulogicAttempt({ is_correct: false, score: 0 }, MESSAGES)

    expect(result.correctWord).toBeNull()
  })

  it('lee una pista', () => {
    const hint = parseHint({ hint_text: 'Empieza por T', word_length: 5, is_common: false }, MESSAGES)

    expect(hint).toEqual({ hintText: 'Empieza por T', wordLength: 5, isCommon: false })
  })
})

describe('el estado de una partida', () => {
  it('lee los intentos de Wordle con su pista de tres letras', () => {
    const state = parseSessionState(
      {
        game_id: 'wordle',
        status: 'active',
        attempts_used: 1,
        max_attempts: 6,
        attempts: [
          {
            attempt_number: 1,
            guess: 'LUNAS',
            feedback: ['correct', 'absent', 'present', 'correct', 'absent'],
            solved: false,
            score: 0,
          },
        ],
        score: 0,
      },
      MESSAGES,
    )

    expect(state.attempts[0].feedback).toEqual([
      'correct',
      'absent',
      'present',
      'correct',
      'absent',
    ])
  })

  it('descarta una pista con un valor desconocido', () => {
    // Una pista con un valor que no se reconoce se pintaría sin estilo y sin
    // texto: sería un estado que nadie ha visto redactado (§2.1.4).
    const state = parseSessionState(
      {
        game_id: 'wordle',
        status: 'active',
        attempts: [
          { attempt_number: 1, guess: 'ABCDE', feedback: ['correct', 'inventado'], solved: false },
        ],
      },
      MESSAGES,
    )

    expect(state.attempts[0].feedback).toEqual(['correct'])
  })

  it('acepta los tres estados que el servidor puede enviar', () => {
    // `lost` **no** existe: en Paraulógic no se puede perder y en los otros dos
    // terminar no es perder (§2.1.4). Un cuarto estado sería una derrota que el
    // producto no tiene.
    for (const status of ['active', 'finished', 'abandoned']) {
      const state = parseSessionState({ game_id: 'paraulogic', status }, MESSAGES)

      expect(state.status).toBe(status)
    }
  })

  it('acepta `null` en los arrays que no aplican a un juego', () => {
    // Acertijo no tiene `found_words` ni `attempts`. Si vinieran como `null` en
    // vez de [], se rompería el `.filter` al pintar.
    const state = parseSessionState(
      { game_id: 'riddle', status: 'active', found_words: null, attempts: null },
      MESSAGES,
    )

    expect(state.foundWords).toEqual([])
    expect(state.attempts).toEqual([])
  })

  it('deduce `solved` de los intentos de Wordle', () => {
    const state = parseSessionState(
      {
        game_id: 'wordle',
        status: 'active',
        attempts: [{ attempt_number: 1, guess: 'LUNAS', feedback: [], solved: true }],
      },
      MESSAGES,
    )

    expect(state.attempts[0].solved).toBe(true)
  })
})

describe('Wordle', () => {
  it('acepta `word: null` cuando la partida ya se jugó', () => {
    // R-014: es el estado de quien vuelve después de jugar. Rechazarlo dejaría
    // la pantalla sin poder explicar qué ha pasado.
    const content = parseWordleContent({ word: null, already_finished: true }, MESSAGES)

    expect(content).toEqual({ word: null, alreadyFinished: true })
  })

  it('acepta la palabra cuando la partida está en marcha', () => {
    const content = parseWordleContent({ word: 'LUNAS', already_finished: false }, MESSAGES)

    expect(content.word).toBe('LUNAS')
  })

  it('rechaza una palabra que no es texto', () => {
    expect(() => parseWordleContent({ word: 42, already_finished: false }, MESSAGES)).toThrow()
  })
})

describe('el acertijo', () => {
  it('lee el enunciado', () => {
    expect(parseRiddleContent({ question: '¿Qué soy?' }, MESSAGES).question).toBe('¿Qué soy?')
  })

  it('lee el resultado de comprobar una respuesta', () => {
    const check = parseRiddleCheck({ is_correct: false, attempts_used: 3 }, MESSAGES)

    expect(check).toEqual({ isCorrect: false, attemptsUsed: 3 })
  })

  it('lee el reporte y confirma que no dio puntos', () => {
    // R-017: la respuesta del servidor afirma que no concede puntos. Se lee, no
    // se deduce: si el campo desapareciera, `false` sigue siendo lo correcto.
    const report = parseRiddleReport(
      { report_id: 3, given_answer: 'cielo', gave_points: false, message: 'Guardado.' },
      MESSAGES,
    )

    expect(report.gavePoints).toBe(false)
    expect(report.givenAnswer).toBe('cielo')
  })
})

describe('salir de la partida', () => {
  it('lee que la partida se ha gastado', () => {
    // R-015: `gave_up` decide si la interfaz tiene que dejar de pintar el juego.
    // Si no se leyera, en Wordle se seguiría enseñando un teclado que ya no
    // sirve, y eso es prometer algo que no se puede hacer (§4.2).
    const result = parseAbandon(
      { game_id: 'wordle', gave_up: true, message: 'Has salido.' },
      MESSAGES,
    )

    expect(result.gaveUp).toBe(true)
  })

  it('lee que la partida sigue viva', () => {
    const result = parseAbandon(
      { game_id: 'paraulogic', gave_up: false, message: 'Has salido.' },
      MESSAGES,
    )

    expect(result.gaveUp).toBe(false)
  })

  it('rechaza un `game_id` que no es texto', () => {
    expect(() => parseAbandon({ game_id: null, gave_up: false, message: 'x' }, MESSAGES)).toThrow()
  })
})