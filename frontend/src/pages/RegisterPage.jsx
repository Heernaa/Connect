import { useRef, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { registerAccount } from '../lib/api.js'
import { hasErrors, validateRegistration } from '../lib/validation.js'
import { routeHref } from '../routes.js'

/**
 * Alta de cuenta (R-011, R-009).
 *
 * · El formulario tiene `noValidate`: la validación la pone este proyecto, no el
 *   navegador. El navegador avisa en el idioma del navegador y con un mensaje
 *   que nadie ha revisado; aquí los mensajes son del diccionario (R-009).
 * · Los errores se muestran **junto a su campo**, con `aria-invalid` y
 *   `role="alert"`, y no solo arriba en un bloque. Quien está en el campo de la
 *   contraseña necesita el aviso de la contraseña (R-009).
 * · Al enviar, el foco se lleva al primer campo con error. Si no, quien está en
 *   el botón de «Crear mi cuenta» oye que hay un error y no sabe dónde
 *   mirar (R-005).
 * · El servidor también valida, y su mensaje se enseña tal cual. Los mensajes
 *   del cliente son una cortesía, no la autoridad (§6.2, R-013).
 */
export function RegisterPage({ onRegistered }) {
  const [values, setValues] = useState({ username: '', password: '', passwordConfirmation: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [created, setCreated] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Una referencia por campo, no un mapa: los campos son fijos y conocidos, y
  // un `ref` por campo deja claro cuál es cuál. La referencia se le pasa al
  // componente, que se la pone al `<input>` (R-005).
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)
  const confirmationRef = useRef(null)

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validateRegistration(values)

    setErrors(found)
    setFormError('')

    if (hasErrors(found)) {
      // Al primer campo que falla: quien está en el botón no va a mirar arriba.
      focusFirstError(found, { username: usernameRef, password: passwordRef, passwordConfirmation: confirmationRef })

      return
    }

    setSubmitting(true)

    try {
      const user = await registerAccount({
        username: values.username.trim(),
        password: values.password,
        passwordConfirmation: values.passwordConfirmation,
      })

      setCreated(user)
      onRegistered(user)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  // La cuenta se crea y ya está: se enseña el resultado en lugar de un formulario
  // que ya no sirve para nada. El alias es lo único que se ve de la cuenta
  // (§2.2, identidad anónima).
  if (created) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-display font-bold tracking-tight">{es.register.heading}</h1>

        <div aria-live="polite" className="ui-card border-success">
          <p className="text-xl font-semibold">
            {format(es.register.success, { alias: created.alias })}
          </p>

          <div className="mt-4">
            <a className="ui-button ui-button--primary" href={routeHref('games')}>
              {es.register.successAction}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-display font-bold tracking-tight">{es.register.heading}</h1>

      <p className="max-w-prose text-lg text-ink-muted">{es.register.intro}</p>

      {/* El formulario va en una tarjeta: un bloque blanco sobre el fondo claro
          separa «aquí se escribe» de «esto es información». */}
      <div className="ui-card">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          {formError && <ErrorMessage>{formError}</ErrorMessage>}

          <TextField
            label={es.register.usernameLabel}
            hint={es.register.usernameHint}
            error={errors.username}
            name="username"
            autoComplete={es.register.usernameAutocomplete}
            value={values.username}
            onChange={update('username')}
            disabled={submitting}
            inputRef={usernameRef}
          />

          <TextField
            label={es.register.passwordLabel}
            hint={es.register.passwordHint}
            error={errors.password}
            type="password"
            name="password"
            autoComplete={es.register.passwordAutocomplete}
            value={values.password}
            onChange={update('password')}
            disabled={submitting}
            inputRef={passwordRef}
          />

          <TextField
            label={es.register.passwordConfirmLabel}
            hint={es.register.passwordConfirmHint}
            error={errors.passwordConfirmation}
            type="password"
            name="password_confirmation"
            autoComplete={es.register.passwordAutocomplete}
            value={values.passwordConfirmation}
            onChange={update('passwordConfirmation')}
            disabled={submitting}
            inputRef={confirmationRef}
          />

          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? es.register.submitting : es.register.submit}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-lg">
        {es.register.haveAccount}{' '}
        <a className="ui-link" href={routeHref('login')}>
          {es.register.haveAccountAction}
        </a>
      </p>
    </div>
  )
}

/**
 * Lleva el foco al primer campo que tenga error.
 *
 * Sin esto, quien está en el botón de «Crear mi cuenta» oye que hay un error y
 * no tiene ni una pista de dónde mirar (R-005). El foco se mueve solo y el
 * mensaje del campo se anuncia con `role="alert"`, de modo que llegar al campo
 * y oír el motivo es la misma acción.
 */
function focusFirstError(errors, fieldRefs) {
  const firstField = Object.keys(errors)[0]

  fieldRefs[firstField]?.current?.focus()
}

export default RegisterPage
