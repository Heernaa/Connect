import { describe, expect, it } from 'vitest'

import { es } from './es.js'
import { format } from './format.js'
import {
  formatCounter,
  formatMessageTime,
  formatPoints,
  isOverLimit,
  isSystemMessage,
  uniqueMessages,
  withRanks,
} from './socialFormat.js'

describe('la hora de un mensaje', () => {
  it('la enseña en 24 horas y con dos dígitos', () => {
    // R-003: la hora se dice como se dice en español, no como la formatea el
    // navegador en el idioma que tenga por defecto.
    expect(formatMessageTime('2026-10-16T14:30:00Z')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('devuelve texto vacío si la fecha no se entiende', () => {
    // R-013: una fecha inválida no puede enseñar «Invalid Date».
    expect(formatMessageTime('no-es-una-fecha')).toBe('')
  })
})

describe('los puntos', () => {
  it('usa el singular para un solo punto', () => {
    expect(formatPoints(1)).toBe(es.leaderboard.pointsSingular)
  })

  it('usa el plural a partir de dos', () => {
    expect(formatPoints(2)).toBe('2 puntos')
    expect(formatPoints(21)).toBe('21 puntos')
  })
})

describe('el contador de letras (R-004)', () => {
  it('dice cuántas llevas cuando queda de sobra', () => {
    expect(formatCounter(10, 500)).toContain('10')
  })

  it('avisa de que queda poco antes de pasarse', () => {
    // Un contador que solo dijera «error» al llegar a 500 sería inútil: el aviso
    // tiene que llegar cuando todavía se puede corregir.
    expect(formatCounter(460, 500)).toBe('Quedan 40 letras.')
  })

  it('dice cuántas sobran cuando ya no cabe', () => {
    expect(formatCounter(505, 500)).toBe('Has escrito 5 letras de más. Borra algo antes de enviar.')
  })
})

describe('el límite de longitud', () => {
  it('permite llegar justo al límite', () => {
    expect(isOverLimit(500, 500)).toBe(false)
  })

  it('rechaza una letra de más', () => {
    expect(isOverLimit(501, 500)).toBe(true)
  })
})

describe('los mensajes del sistema', () => {
  it('reconoce los del servidor', () => {
    // R-007: tienen que ser distinguibles de lo que escribe una persona, para
    // que nadie pueda hacerse pasar por el sistema (§6.4).
    expect(isSystemMessage({ kind: 'system' })).toBe(true)
  })

  it('no confunde los de una persona', () => {
    expect(isSystemMessage({ kind: 'user' })).toBe(false)
  })
})

describe('los mensajes repetidos', () => {
  it('elimina los duplicados conservando el orden', () => {
    // El mensaje que acabas de enviar vuelve con la siguiente consulta del
    // polling. Sin esto aparecería dos veces seguidas.
    const mensajes = [
      { messageId: 1, body: 'primero' },
      { messageId: 2, body: 'segundo' },
      { messageId: 1, body: 'primero' },
    ]

    expect(uniqueMessages(mensajes).map((m) => m.body)).toEqual(['primero', 'segundo'])
  })

  it('no toca el arreglo original', () => {
    const mensajes = [{ messageId: 1 }, { messageId: 1 }]

    uniqueMessages(mensajes)

    expect(mensajes).toHaveLength(2)
  })
})

describe('el puesto en la clasificación (R-002)', () => {
  it('numera desde el uno y en el orden que llega', () => {
    const filas = withRanks([
      { alias: 'A', points: 30 },
      { alias: 'B', points: 20 },
      { alias: 'C', points: 10 },
    ])

    expect(filas.map((f) => f.rank)).toEqual([1, 2, 3])
  })

  it('no modifica las filas originales', () => {
    const entrada = { alias: 'A', points: 30 }

    withRanks([entrada])

    expect(entrada.rank).toBeUndefined()
  })
})

describe('los textos del diccionario', () => {
  it('el aviso de bloqueo lleva el alias en el hueco', () => {
    // §4.2: el texto con huecos se rellena, no se concatena.
    expect(format(es.block.blockedNow, { alias: 'LoboTranquilo' })).toContain('LoboTranquilo')
  })

  it('no queda ningún «{» sin rellenar en los textos de la clasificación y el chat', () => {
    // Si un texto tuviera un hueco que ningún código rellena, se vería tal cual
    // en pantalla, con las llaves dentro.
    const secciones = [es.leaderboard, es.chat, es.block, es.deleteAccount]
    const conHuecos = JSON.stringify(secciones).match(/\{[a-zA-Z]+\}/g) ?? []

    const huesValidos = ['{points}', '{count}', '{max}', '{written}', '{left}', '{extra}', '{alias}', '{game}', '{time}']

    expect(conHuecos.every((hueco) => huesValidos.includes(hueco))).toBe(true)
  })
})

describe('el relleno de textos', () => {
  it('rellena el hueco de un texto', () => {
    expect(format('Hola {nombre}', { nombre: 'Carmen' })).toBe('Hola Carmen')
  })

  it('devuelve el texto tal cual si no hay nada que rellenar', () => {
    // Evita que un `format(texto)` sin segundo argumento reviente la pantalla
    // con un `TypeError`: `Object.entries(undefined)` lanza, y el resultado sería
    // una pantalla en blanco en vez de un mensaje (R-013).
    expect(format('Texto sin huecos')).toBe('Texto sin huecos')
  })

  it('deja el hueco si falta el valor, en vez de inventarlo', () => {
    // Un texto que enseña «{alias}» en pantalla es feo, pero uno que enseña
    // «undefined» o una cadena vacía en su lugar sería peor: nadie sabría qué
    // falta. El hueco delata el error en el código; el valor falso lo disimula.
    expect(format('Hola {nombre}', {})).toBe('Hola {nombre}')
  })
})