import { useId } from 'react'

import { es } from '../../i18n/es.js'
import { StatusIndicator } from './StatusIndicator.jsx'

/**
 * Avisos de error y de información en lenguaje llano (R-009).
 *
 * Un error de esta interfaz dice **qué pasó y qué hacer**. Nunca lleva un código
 * técnico, nunca lleva «undefined» y nunca dice solo «algo ha ido mal» sin
 * decir cuál era el siguiente paso.
 *
 * `role="alert"` hace que un lector de pantalla lo lea en cuanto aparece, sin
 * que quien esté usando la pantalla tenga que buscarlo. Es un anuncio apremiante
 * por una razón: un error de validación es algo que hay que resolver ahora, no
 * una notificación que puede esperar.
 */


export function ErrorMessage({
  children,
  title,
  tone = 'danger',
  retryLabel,
  onRetry,
}) {
  // El id es único por instancia: si a la vez hubiera dos bloques de error en
  // la misma pantalla, `aria-labelledby` apuntaría al equivocado.
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      role="alert"
      className={`ui-card ${tone === 'danger' ? 'border-danger' : 'border-border'}`}
    >
      <h2 id={headingId} className="text-xl font-semibold">
        {title ?? es.errors.title}
      </h2>

      <p className="mt-2 text-lg">
        <StatusIndicator tone={tone}>{children}</StatusIndicator>
      </p>

      {onRetry && (
        <button type="button" className="ui-button ui-button--secondary mt-4" onClick={onRetry}>
          {retryLabel ?? es.common.retry}
        </button>
      )}
    </section>
  )
}

/**
 * Aviso informativo que no es un error: una pista, una explicación, una nota.
 *
 * Comparte el aspecto con `ErrorMessage` a propósito: quien no distingue el
 * rojo del amarillo sigue leyendo los dos, porque los dos llevan icono y
 * frase. La diferencia de color es una comodidad, no el canal (R-004).
 *
 * Aquí no lleva `role="alert"`: un aviso informativo no interrumpe. Interrumpir
 * por algo que no requiere acción es exactamente el tipo de ruido que hace que
 * alguien apague el lector de pantalla.
 */
export function InfoMessage({ children, title, tone = 'brand' }) {
  return (
    <section className={`ui-card ${tone === 'warning' ? 'bg-warning-soft' : 'bg-brand-soft'}`}>
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      <p className="mt-2 text-lg">
        <StatusIndicator tone={tone}>{children}</StatusIndicator>
      </p>
    </section>
  )
}

export default ErrorMessage
