import { useRef, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { es } from '../i18n/es.js'
import { loginAccount } from '../lib/api.js'
import { hasErrors, validateLogin } from '../lib/validation.js'
import { routeHref } from '../routes.js'

/**
 * Inicio de sesión (R-011, R-009).
 *
 * Lo importante aquí es lo que **no** se hace:
 *
 * · No se comprueba la longitud de la contraseña en el cliente. Si alguien que ya
 *   tiene cuenta se equivoca al teclear, necesita «el usuario o la contraseña no
 *   son correctos», no «la contraseña necesita al menos 8 caracteres». Además,
 *   mensajes distintos según el fallo son justo lo que permite ir anotando qué
 *   cuentas existen (§6.3).
 * · No se distingue entre «ese usuario no existe» y «la contraseña no es la
 *   buena». El servidor tampoco lo hace, y y el cliente tampoco inventa un mensaje
 *   más concreto por su cuenta.
 * · El servidor puede devolver tres cosas distintas y las tres se enseñan tal
 *   cual, con su frase: credenciales incorrectas, cuenta bloqueada por intentos
 *   fallidos, o un fallo de conexión. Todas dicen qué hacer.
 */
export function LoginPage({ onSignedIn }) {
  const [values, setValues] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Una referencia por campo; se le pasan al componente, que las pone en el
  // `<input>` (R-005).
  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const update = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const found = validateLogin(values)

    setErrors(found)
    setFormError('')

    if (hasErrors(found)) {
      focusFirstError(found, { username: usernameRef, password: passwordRef })

      return
    }

    setSubmitting(true)

    try {
      const user = await loginAccount({
        username: values.username.trim(),
        password: values.password,
      })

      onSignedIn(user)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <h1 className="text-display font-bold tracking-tight">{es.login.heading}</h1>

      <p className="max-w-prose text-lg text-ink-muted">{es.login.intro}</p>

      {/* El formulario va en una tarjeta: un bloque blanco sobre el fondo claro
          separa «aquí se escribe» de «esto es información». */}
      <div className="ui-card">
        <form className="flex flex-col gap-6" onSubmit={handleSubmit} noValidate>
          {formError && <ErrorMessage>{formError}</ErrorMessage>}

          <TextField
            label={es.login.usernameLabel}
            error={errors.username}
            name="username"
            autoComplete={es.login.usernameAutocomplete}
            value={values.username}
            onChange={update('username')}
            disabled={submitting}
            inputRef={usernameRef}
          />

          <TextField
            label={es.login.passwordLabel}
            error={errors.password}
            type="password"
            name="password"
            autoComplete={es.login.passwordAutocomplete}
            value={values.password}
            onChange={update('password')}
            disabled={submitting}
            inputRef={passwordRef}
          />

          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={submitting}>
              {submitting ? es.login.submitting : es.login.submit}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-lg">
        {es.login.noAccount}{' '}
        <a className="ui-link" href={routeHref('register')}>
          {es.login.noAccountAction}
        </a>
      </p>
    </div>
  )
}

/**
 * Lleva el foco al primer campo que tenga error.
 *
 * Quien está en el botón de «Entrar» oye que hay un error y, si el foco no se
 * mueve, no sabe dónde mirar (R-005).
 */
function focusFirstError(errors, fieldRefs) {
  const firstField = Object.keys(errors)[0]

  fieldRefs[firstField]?.current?.focus()
}

export default LoginPage
