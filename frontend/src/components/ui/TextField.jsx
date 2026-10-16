import { useId } from 'react'

import { es } from '../../i18n/es.js'
import { format } from '../../i18n/format.js'

/**
 * Campo de formulario (R-006, R-009).
 *
 * Todo lo que exige la spec sobre un campo se cumple aquí, una sola vez:
 *
 * · Cada campo tiene su `<label for>`, asociado por `id` generado con
 *   `useId`. Un campo sin etiqueta es un campo que un lector de pantalla
 *   anuncia como «campo de texto, en blanco»: inútil (R-006).
 * · La pista de ayuda y el mensaje de error se conectan con `aria-describedby`,
 *   de modo que al enfocar el campo se oyen. La ayuda explica, el error avisa:
 *   son dos reglas distintas y por eso son dos `id` distintos.
 * · Con error, el campo lleva `aria-invalid="true"`. El color del borde avisa a
 *   quien ve; este atributo avisa a quien no ve (R-004, R-009).
 * · El error lleva `role="alert"`, que el lector de pantalla lee en cuanto
 *   aparece, sin tener que ir a buscarlo (R-009).
 * · `min-height` de 44px y fuente de 18px: el área pulsable y el tamaño de la
 *   letra los pone el CSS (R-002).
 *
 * **Por qué no se pone el atributo `required` de HTML:** el navegador pinta su
 * propio mensaje, en el idioma del navegador y sin controlar su redacción. Aquí
 * los mensajes son los del diccionario, en español llano, y los escribe el
 * componente padre. Se marca la obligatoriedad con `aria-required`, que es lo
 * que lee el lector de pantalla, y la comprobación se hace en el formulario
 * (`noValidate`).
 */
export function TextField({
  label,
  hint,
  error,
  type = 'text',
  autoComplete,
  value,
  onChange,
  required = true,
  disabled = false,
  name,
  inputRef,
}) {
  // `useId` genera identificadores únicos por instancia. Hace falta porque los
  // ids viajan al HTML (atributo `for`, `aria-describedby`), donde sí pueden
  // repetirse: dos páginas montadas a la vez, o dos pruebas en el mismo
  // documento, romperían la asociación si fueran fijos.
  const fieldId = useId()
  const hintId = `${fieldId}-hint`
  const errorId = `${fieldId}-error`

  // Un solo `aria-describedby` con los dos ids, en el orden en que se leen:
  // primero qué es este campo, y después qué está mal.
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={fieldId}>
        {label}
        <span className="text-ink-muted font-normal">
          {' '}
          {format(es.common.fieldRequirement, { state: required ? es.common.mandatory : es.common.optional })}
        </span>
      </label>

      {hint && (
        <p className="ui-field__hint" id={hintId}>
          {hint}
        </p>
      )}

      <input
        className="ui-field__input"
        id={fieldId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
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

export default TextField
