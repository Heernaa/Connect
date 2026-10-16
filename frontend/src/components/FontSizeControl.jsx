import { useTextScale } from '../hooks/useTextScale.js'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'

/**
 * Control del tamaño del texto (R-001).
 *
 * Sobre los nombres accesibles de los dos botones, que es lo delicado:
 *
 * · Cada botón necesita explicarse («Reducir el texto»): con solo una letra
 *   dentro, un lector de pantalla anunciaría «A», que no dice qué hace (R-006).
 * · Pero el texto visible **tiene que formar parte** del nombre accesible
 *   (WCAG 2.5.3, «Label in Name»). Con un `aria-label` que no contiene lo que se
 *   ve, quien usa reconocimiento de voz oye «A» en pantalla y dice «A», y el
 *   botón no responde: de ahí el fallo que encontró axe-core.
 * · Por eso el botón lleva las dos cosas: el glifo `A−` visible, y la
 *   explicación en un `span` solo para lectores de pantalla. El nombre accesible
 *   queda «A− Reducir el texto», que contiene el texto visible y además explica
 *   la función.
 *
 * El porcentaje actual se escribe en pantalla, no solo en el atributo del
 * botón. Motivo: quien no distingue bien las letras ve que ha pulsado cuatro
 * veces y necesita saber si el botón responde. Un estado solo audible es un
 * estado solo para quien oye (R-001).
 *
 * El tamaño se anuncia con `aria-live="polite"`: cambiar el tamaño no requiere
 * interrumpir lo que el lector de pantalla estuviera leyendo.
 */
export function FontSizeControl({ className = '' }) {
  const { percent, canIncrease, canDecrease, increase, decrease } = useTextScale()

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <span className="font-semibold" id="text-size-label">
        {es.accessibility.textSize}
      </span>

      <div className="flex gap-2" role="group" aria-labelledby="text-size-label">
        <button
          type="button"
          className="ui-button ui-button--secondary px-4 text-2xl leading-none"
          onClick={decrease}
          disabled={!canDecrease}
        >
          <span>A−</span>
          <span className="sr-only">{es.accessibility.decreaseTextSize}</span>
        </button>

        <button
          type="button"
          className="ui-button ui-button--secondary px-4 text-2xl leading-none"
          onClick={increase}
          disabled={!canIncrease}
        >
          <span>A+</span>
          <span className="sr-only">{es.accessibility.increaseTextSize}</span>
        </button>
      </div>

      {/*
        Con el máximo pulsado el botón se deshabilita y esta línea explica por
        qué (R-009: el mensaje dice qué ha pasado, no solo que algo falló).
      */}
      <p className="text-ink-muted" aria-live="polite">
        {format(es.accessibility.currentTextSize, { percent })}
        {!canIncrease && ` ${es.accessibility.textSizeMax}`}
      </p>
    </div>
  )
}

export default FontSizeControl
