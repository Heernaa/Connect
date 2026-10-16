import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_TEXT_SCALE,
  STORAGE_KEY,
  TEXT_SCALE_STEPS,
  applyTextScale,
  persistTextScale,
  restoreTextScale,
  scaleIndexFromPercent,
} from './textScale.js'

/**
 * Tamaño del texto (R-001).
 *
 * Se prueban las tres cosas que hacen que el requisito sea cierto y no una
 * promesa: que se puede llegar **exactamente** al 200%, que el tamaño elegido
 * sobrevive a la recarga, y que un valor guardado corrupto no rompe nada.
 */
describe('tamaño del texto (R-001)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.style.removeProperty('--font-scale')
  })

  it('llega exactamente al 200%', () => {
    // El criterio de aceptación dice «hasta el 200%». Un 175% redondeado deja
    // fuera a quien necesita el doble, así que el último paso tiene que ser 200
    // y no un «casi 200».
    expect(Math.max(...TEXT_SCALE_STEPS)).toBe(200)
  })

  it('empieza en el 100%', () => {
    expect(DEFAULT_TEXT_SCALE).toBe(100)
    expect(TEXT_SCALE_STEPS[0]).toBe(100)
  })

  it('no baja del 100% ni pasa del 200%', () => {
    // Ni una letra tan grande que reviente la página, ni una opción tan pequeña que
    // no se pueda leer. Los pasos no se mueven de sitio por mucho que se intente.
    expect(Math.min(...TEXT_SCALE_STEPS)).toBe(100)
  })

  it('aplica la escala como multiplicador del tamaño del navegador', () => {
    applyTextScale(150)

    // El atributo se aplica a `<html>` porque todo el layout usa rem: si se
    // escalara solo el texto, un título al 200% se saldría de su caja (R-010).
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.5')
  })

  it('guarda la escala para que sobreviva a la recarga', () => {
    persistTextScale(175)

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('175')

    // Simular la recarga: se borra el DOM, se lee lo guardado.
    document.documentElement.style.removeProperty('--font-scale')

    expect(restoreTextScale()).toBe(175)
    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.75')
  })

  it('usa el tamaño por defecto si no hay nada guardado', () => {
    expect(restoreTextScale()).toBe(DEFAULT_TEXT_SCALE)
  })

  it.each([
    ['un texto sin sentido', 'no soy un porcentaje'],
    ['un número que no está en la lista', 137],
    ['un número enorme', 100000],
    ['negativo', -50],
  ])('ignora %s y vuelve al tamaño por defecto', (_label, stored) => {
    // Alguien puede editar lo guardado a mano, o la lista puede cambiar en una
    // versión nueva. Un valor raro no puede romper la aplicación.
    window.localStorage.setItem(STORAGE_KEY, String(stored))

    expect(restoreTextScale()).toBe(DEFAULT_TEXT_SCALE)
  })

  it('no se rompe si el navegador no deja guardar', () => {
    // Modo privado y cookies bloqueadas lanzan aquí. Perder la persistencia es
    // una molestia; romperse al arrancar, no.
    // Se espía `Storage.prototype` y no el objeto de `window.localStorage`:
    // el método vive en el prototipo, y sustituirlo en la instancia no llega a
    // interceptar la llamada.
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('almacenamiento no disponible')
    })

    try {
      expect(persistTextScale(150)).toBe(false)
      // Aunque no se pueda guardar, el tamaño se aplica igual en esta sesión.
      expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.5')
    } finally {
      spy.mockRestore()
    }
  })

  it('traduce un porcentaje a su posición en la lista', () => {
    expect(scaleIndexFromPercent(100)).toBe(0)
    expect(scaleIndexFromPercent(200)).toBe(TEXT_SCALE_STEPS.length - 1)
    expect(scaleIndexFromPercent(137)).toBe(0)
  })
})
