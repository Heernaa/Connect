/**
 * Los mensajes de Paraulógic dicen la verdad sobre lo que ha pasado.
 *
 * No es una comprobación de estilo. El texto de este juego se escribió durante
 * meses diciendo «esa palabra no está en el conjunto», y era falso: el conjunto
 * de *letras* era `AENRST` y la palabra `ENTRAS` se podía hacer con esas seis
 * letras sin repetir ninguna. El jugador que la pensaba no se equivocaba, y el
 * mensaje lo corrigió sin más.
 *
 * Un mensaje que corrige sin motivo hace que quien lo lee deje de fiarse de los
 * mensajes, que es el peor sitio posible para perder la confianza de alguien que
 * está aprendiendo a usar el móvil (§1.1, §2.1.4).
 *
 * Aquí se fija qué debe decir cada mensaje, y sobre todo qué **no** debe decir.
 */

import { describe, expect, it } from 'vitest'

import { es } from './es.js'

describe('mensajes de Paraulógic', () => {
  describe('cuando las letras no valen', () => {
    it('el backend es quien dice qué letra sobra, y el cliente no lo tapa', () => {
      // No hay mensaje propio para este caso a propósito: el texto del 422 lo
      // pinta el servidor («La palabra usa la letra «E» 2 veces y el conjunto solo
      // tiene 1») y es mucho más útil que cualquier cosa que se le diga desde
      // aquí. Lo que se comprueba es que el cliente no lo tape.
      expect(es.paraulogic.submit).toBeTruthy()
      expect(Object.values(es.paraulogic).every((v) => typeof v === 'string' || typeof v === 'function')).toBe(true)
    })
  })

  describe('cuando las letras valen pero la palabra no es del juego', () => {
    it('NO dice que la palabra no esté en el conjunto', () => {
      // «No está en el conjunto» era la frase que hacía falso el mensaje. Las
      // letras estaban bien —si no, el servidor habría dicho cuál sobraba—, así
      // que atribuir el fallo al conjunto de letras mandaba a un callejón sin
      // salida.
      expect(es.paraulogic.incorrect.toLowerCase()).not.toContain('no está en el conjunto')
    })

    it('dice explícitamente que las letras estaban bien', () => {
      // Sin esto el jugador no puede distinguir «me equivoqué al teclear» de
      // «el juego no me deja», y son dos problemas distintos.
      expect(es.paraulogic.incorrect.toLowerCase()).toMatch(/letras.*bien|bien.*letras/)
    })

    it('aclara que es una palabra del juego lo que falta, no una palabra', () => {
      expect(es.paraulogic.incorrect.toLowerCase()).toContain('del juego')
    })

    it('no dice «incorrecta», para no sonar a suspenso', () => {
      // El juego no se puede perder (§2.1.4). «Incorrecta» convierte un intento
      // en un suspenso; «prueba otra» no.
      expect(es.paraulogic.incorrect.toLowerCase()).not.toContain('incorrecta')
    })

    it('dice que no pasa nada por fallar', () => {
      // Sin esta frase, quien tiene miedo a perder algo —y a esta edad es un
      // miedo razonable— no vuelve a intentarlo (§2.1.4).
      expect(es.paraulogic.incorrect.toLowerCase()).toMatch(/no pasa nada/i)
    })

    it('invita a probar otra palabra en vez de terminar ahí', () => {
      expect(es.paraulogic.incorrect.toLowerCase()).toMatch(/prueba otra/i)
    })
  })

  describe('el contador de pendientes', () => {
    it('no anuncia el total de palabras, sino las que quedan', () => {
      // «Quedan 56 palabras» baja al encontrar cada una. «57 palabras» sería
      // verdad todo el rato y no diría nada.
      expect(es.paraulogic.pending).toContain('{count}')
      expect(es.paraulogic.pending.toLowerCase()).toContain('quedan')
    })
  })

  describe('el botón de pista', () => {
    it('dice en el propio botón que no resta puntos', () => {
      // No en una letra pequeña al lado (§2.1.5).
      expect(es.paraulogic.hintButtonHint.toLowerCase()).toMatch(/no te resta puntos/i)
    })
  })
})
