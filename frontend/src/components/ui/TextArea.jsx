import { useId } from 'react'

import { es } from '../../i18n/es.js'
import { format } from '../../i18n/format.js'

/**
 * Área de texto (R-006, R-009).
 *
 * Va aparte de `TextField` porque es otra cosa: un `<input>` es una línea y un
 * mensaje de chat no lo es. Poner un `maxlength` alto en un `input` y hacer que
 * el navegador eldest el texto al llegar al final sería peor que no tener nada:
 * quien está escribiendo vería su mensaje cortada sin aviso, y creería que la ha
 * escrito mal (R-004).
 *
 * Lo que comparte con `TextField`, y que vuelve a estar aquí porque son reglas
 * distintas en un elemento distinto:
 *
 * · `<label for>` asociado por `useId` (R-006).
 * · La pista y el error conectados con `aria-describedby`, para que se oigan al
 *   enfocar el campo.
 * · Con error, `aria-invalid` y un mensaje con `role="alert"` (R-009).
 * · 44px de alto mínimo y 18px de fuente, los pone el CSS (R-002).
 *
 * **El contador no va dentro del campo.** Es un texto aparte porque el
 * `maxlength` del navegador ya avisa por su cuenta, y si el contador viviera
 * dentro, al escribir se movería el texto de debajo mientras se lee. Aquí está
 * fuera, quieto, y con `aria-live` para que se anuncie.
 */
export function TextArea({
  label,
  hint,
  error,
  name,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  required = false,
  inputRef,
}) {
  const fieldId = useId()
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="text-ink-muted font-normal">
            {' '}
            {format(es.common.fieldRequirement, { state: es.common.mandatory })}
          </span>
        )}
      </label>

      {hint && (
        <p className="ui-field__hint" id={hintId}>
          {hint}
        </p>
      )}

      <textarea
        className="ui-field__input ui-field__textarea"
        id={fieldId}
        name={name}
        rows={rows}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        aria-invalid={error ? 'true' : undefined}
        aria-required={required ? 'true' : undefined}
        disabled={disabled}
        ref={inputRef}
      />

      {error && (
        <p className="flex items-start gap-2 font-semibold text-danger" id={errorId} role="alert">
          <span aria-hidden="true" className="ui-status__icon">
            !
          </span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}

export default TextArea