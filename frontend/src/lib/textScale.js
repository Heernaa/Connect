/**
 * Escalado del texto, con persistencia (R-001).
 *
 * Decisiones que importan para la accesibilidad:
 *
 * · El tamaño elegido **sobrevive a la recarga**. Sin esto, alguien que necesita
 *   el 200% tendría que volver a ampliarlo en cada visita (criterio de éxito de
 *   la spec).
 * · Se aplica como multiplicador de `100%` en `<html>`, no como `font-size` en
 *   puntos. Al ser `rem`, **todo** el layout escala con él: si se escalara solo
 *   el texto, un título al 200% se saldría de su caja y el contenido se
 *   solaparía (R-010).
 * · Los pasos llegan **exactamente al 200%**. Un «200%» redondeado a 175% deja
 *   fuera a quien lo necesita.
 * · El estado vive en un `CustomEvent` y no en un contexto de React: el valor
 *   hay que aplicarlo al `<html>` **antes** de que React monte, para que no haya
 *   un parpadeo con el tamaño anterior al recargar.
 */

export const STORAGE_KEY = 'connect.textScale'

/** Porcentajes disponibles. El último es el 200% que pide R-001. */
export const TEXT_SCALE_STEPS = [100, 112, 125, 150, 175, 200]

/** Valor por defecto: el 100% del navegador, que es 16px. */
export const DEFAULT_TEXT_SCALE = 100

/** Evento con el que se avisa a la interfaz de que el tamaño ha cambiado. */
export const TEXT_SCALE_EVENT = 'connect:text-scale'

/** Devuelve el índice del paso de escala a partir de un porcentaje. */
export function scaleIndexFromPercent(percent) {
  const index = TEXT_SCALE_STEPS.indexOf(percent)

  return index === -1 ? 0 : index
}

/**
 * Escribe la escala en el DOM.
 *
 * Se separa del resto para poder llamarla desde `main.jsx` **antes** de
 * `createRoot`, que es donde importa que no haya parpadeo.
 */
export function applyTextScale(percent) {
  const scale = percent / 100

  document.documentElement.style.setProperty('--font-scale', String(scale))
}

/**
 * Lee la escala guardada y la aplica.
 *
 * `localStorage` puede lanzar (modo privado de algunos navegadores, cookies
 * bloqueadas). Eso no puede romper la aplicación: si falla, se usa el tamaño
 * por defecto y se sigue.
 */
export function restoreTextScale() {
  let percent = DEFAULT_TEXT_SCALE

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)

    if (stored !== null) {
      const parsed = Number.parseInt(stored, 10)

      // Un valor guardado que no está en la lista se ignora: alguien pudo
      // editarlo a mano, o la lista pudo cambiar en una versión nueva.
      if (TEXT_SCALE_STEPS.includes(parsed)) {
        percent = parsed
      }
    }
  } catch {
    percent = DEFAULT_TEXT_SCALE
  }

  applyTextScale(percent)

  return percent
}

/** Guarda la escala elegida. Devuelve si ha podido guardarse. */
export function persistTextScale(percent) {
  applyTextScale(percent)

  try {
    window.localStorage.setItem(STORAGE_KEY, String(percent))

    return true
  } catch {
    return false
  }
}
