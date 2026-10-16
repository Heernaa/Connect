import { useEffect, useState } from 'react'

import {
  DEFAULT_TEXT_SCALE,
  STORAGE_KEY,
  TEXT_SCALE_EVENT,
  TEXT_SCALE_STEPS,
  persistTextScale,
  scaleIndexFromPercent,
} from '../lib/textScale.js'

/**
 * Estado del tamaño del texto, compartido por todos los controles (R-001).
 *
 * Dos `<FontSizeControl>` en la misma pantalla tienen que estar de acuerdo. Se
 * hace con un evento del navegador y no con contexto porque el valor también lo
 * necesita `main.jsx`, que escribe en `<html>` antes de que React exista.
 *
 * El valor guardado se lee **al inicializar el estado**, no en un efecto: leerlo
 * en un efecto provocaría un primer pintado con el tamaño por defecto y luego un
 * segundo con el guardado. Ese parpadeo es justo lo que R-001 viene a evitar
 * (§3.3: el estado se deriva durante el render, no después).
 */
export function useTextScale() {
  const [percent, setPercent] = useState(readStoredPercent)

  // El efecto solo queda para sincronizarse con el evento del navegador, que es
  // un sistema externo al componente.
  useEffect(() => {
    const handleChange = (event) => {
      setPercent(event.detail.percent)
    }

    window.addEventListener(TEXT_SCALE_EVENT, handleChange)

    return () => window.removeEventListener(TEXT_SCALE_EVENT, handleChange)
  }, [])

  const changeTo = (nextPercent) => {
    setPercent(nextPercent)
    persistTextScale(nextPercent)

    // Se avisa al resto de controles de la misma pantalla.
    window.dispatchEvent(new CustomEvent(TEXT_SCALE_EVENT, { detail: { percent: nextPercent } }))
  }

  const increase = () => {
    const nextIndex = Math.min(scaleIndexFromPercent(percent) + 1, TEXT_SCALE_STEPS.length - 1)

    changeTo(TEXT_SCALE_STEPS[nextIndex])
  }

  const decrease = () => {
    const nextIndex = Math.max(scaleIndexFromPercent(percent) - 1, 0)

    changeTo(TEXT_SCALE_STEPS[nextIndex])
  }

  return {
    percent,
    canIncrease: scaleIndexFromPercent(percent) < TEXT_SCALE_STEPS.length - 1,
    canDecrease: scaleIndexFromPercent(percent) > 0,
    increase,
    decrease,
    changeTo,
  }
}

/**
 * Lee el porcentaje guardado.
 *
 * `localStorage` puede lanzar si las cookies están bloqueadas o en navegación
 * privada. Eso no puede romper la aplicación: si falla, se usa el tamaño por
 * defecto y se sigue.
 */
function readStoredPercent() {
  try {
    const parsed = Number.parseInt(window.localStorage.getItem(STORAGE_KEY), 10)

    return TEXT_SCALE_STEPS.includes(parsed) ? parsed : DEFAULT_TEXT_SCALE
  } catch {
    return DEFAULT_TEXT_SCALE
  }
}
