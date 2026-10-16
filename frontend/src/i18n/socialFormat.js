import { es } from './es.js'
import { format } from './format.js'

/**
 * Formatos de la clasificación y del chat (spec 007).
 *
 * Viven aquí y no dentro de los componentes por la misma razón que el resto de
 * los textos: **una cadena visible se escribe en un solo sitio**. Si el formato
 * de la hora estuviera en el componente del mensaje y el del contador en el
 * formulario, habría dos reglas para decidir si un número lleva plural.
 */

/**
 * La hora de un mensaje (R-003).
 *
 * Se enseña en 24 horas con dos dígitos: «14:30». Es como se dice la hora en
 * español, y un `2:30 PM` en un sitio donde se habla español es un empujón a
 * tener que descifrarlo.
 *
 * **No se usa `toLocaleTimeString` sin argumentos.** El resultado depende del
 * idioma y de la zona horaria del navegador, que no tienen por qué coincidir con
 * los del proyecto: alguien con el navegador en inglés vería la hora en otro
 * formato sin querer. Se pasan las dos cosas explícitamente.
 */
export function formatMessageTime(isoString) {
  const date = new Date(isoString)

  if (Number.isNaN(date.getTime())) return ''

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

/**
 * «1 punto» o «3 puntos», sin plurales escritos a mano.
 *
 * El singular está aparte en el diccionario porque en español cambiar la letra
 * no es solo cambiar la `s`.
 */
export function formatPoints(points) {
  return points === 1 ? es.leaderboard.pointsSingular : format(es.leaderboard.points, { points })
}

/**
 * El contador de letras (R-004).
 *
 * Dice **cuántas quedan**, y no cuántas llevas, porque lo que interesa es si
 * cabe. Solo cuando ya no cabe dice cuántas sobran, que es el dato útil para
 * decidir qué borrar.
 */
export function formatCounter(written, maxLength) {
  if (written > maxLength) {
    return format(es.chat.counterOverLimit, { extra: written - maxLength })
  }

  const left = maxLength - written

  // El aviso de «te queda poco» aparece **antes** de pasarse, y no como error:
  // todavía se puede enviar. Pasarse ya impide enviar, y eso sí lleva `role="alert"`.
  if (left <= 50) {
    return format(es.chat.counterNearLimit, { left })
  }

  return format(es.chat.counter, { written, max: maxLength })
}

/**
 * Si el texto se ha pasado del límite.
 *
 * Separado de `formatCounter` porque son dos preguntas distintas: una es «qué
 * le digo a la persona?» y la otra es «¿puede enviar?». Juntas en una función,
 * el aviso y el botón acabarían casados, y deshabilitar el envío por un aviso
 * que todavía no es un error sería molestar.
 */
export function isOverLimit(written, maxLength) {
  return written > maxLength
}

/** Los mensajes del sistema se distinguen por su origen, no por su estilo (§6.4). */
export function isSystemMessage(message) {
  return message.kind === 'system'
}

/**
 * Quita mensajes repetidos, conservando el orden.
 *
 * Hace falta porque el mensaje que acabas de enviar vuelve con la siguiente
 * consulta del polling, y sin esto aparecería dos veces seguidas en pantalla.
 * Lo normal sería que saliera de la respuesta y no se volviera a pedir, pero
 * quien está leyendo puede tener el chat abierto desde antes de enviarlo.
 */
export function uniqueMessages(messages) {
  const seen = new Set()

  return messages.filter((message) => {
    if (seen.has(message.messageId)) return false

    seen.add(message.messageId)
    return true
  })
}

/** El puesto de cada fila, empezando en 1 (R-002). */
export function withRanks(entries) {
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }))
}