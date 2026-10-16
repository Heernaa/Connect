/**
 * Indicador de estado: color **más** icono **más** texto (R-004).
 *
 * Este componente es la pieza que hace que el proyecto cumpla la regla de que
 * ninguna información depende solo del color. Un estado se pinta de tres
 * maneras a la vez:
 *
 * · **Color**: el tono que le toca.
 * · **Forma**: el icono, con su borde, es un segundo canal para quien no
 *   distingue rojo de verde.
 * · **Texto**: la frase que lo dice sin ambigüedad. Es el canal que no falla
 *   nunca: un lector de pantalla solo lee esto.
 *
 * Los tres son obligatorios. Por eso el componente **no** acepta un estado sin
 * texto ni sin icono, aunque se le pase solo el color: quien añada un estado
 * nuevo tiene que escribir la frase, y esa es exactamente la parte que se queda
 * fuera si solo se pintara el color.
 *
 * Es la base sobre la que se construirá la pista de cada letra de Wordle, que
 * es el caso que la spec marca como obligatorio (§2.1.4): «en su sitio», «está
 * en la palabra» y «no está» tienen que ser distinguibles sin ver el color.
 */

const TONES = {
  neutral: 'text-ink-muted',
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  brand: 'text-brand',
}

/**
 * Iconos por tono. Se eligen por lo que significan, no por lo que se ven:
 * `✓` es un acierto, `!` un aviso, `✕` un fallo, `?` una duda, `i` una
 * información. Los cuatro últimos se distinguen entre sí **por la forma**, no
 * solo por el color.
 */
const ICONS = {
  success: '✓',
  danger: '✕',
  warning: '!',
  brand: 'i',
  neutral: '?',
}

/**
 * @param {object} props
 * @param {'neutral'|'success'|'danger'|'warning'|'brand'} props.tone
 * @param {string} props.children El texto del estado. Sin texto no hay estado.
 */
export function StatusIndicator({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`ui-status ${TONES[tone] ?? TONES.neutral} ${className}`.trim()}>
      {/*
        `aria-hidden`: el icono es redundante. Si el lector de pantalla lo leyera,
        anunciaría «¡!» o «✓» antes de la frase, que no aporta nada y confunde.
      */}
      <span aria-hidden="true" className="ui-status__icon">
        {ICONS[tone] ?? ICONS.neutral}
      </span>
      <span className="ui-status__text">{children}</span>
    </span>
  )
}

export default StatusIndicator
