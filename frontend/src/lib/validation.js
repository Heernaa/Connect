import { es } from '../i18n/es.js'

/**
 * Comprobaciones de los formularios, en el cliente (R-009).
 *
 * Tres cosas que hay que tener claras sobre por qué esto existe:
 *
 * · **No sustituye a la del servidor.** El servidor vuelve a comprobarlo todo;
 *   comprobar en el cliente es por quien está delante de la pantalla, que
 *   merece una respuesta inmediata en vez de un viaje de ida y vuelta para
 *   enterarse de que le faltan dos letras (spec 003 · R-002).
 * · **Los mensajes son los del diccionario**, y son los mismos que usa el
 *   servidor, para que el texto no cambie según por dónde pase la validación.
 * · **Las reglas salen de la constitución**, no de aquí: mínimo 8 caracteres de
 *   contraseña (§6.2) y mínimo 3 del nombre de usuario (`backend/app/errors.py`).
 *   Si someday cambiaran, habría que cambiar ambos sitios a la vez.
 */

export const MIN_PASSWORD_LENGTH = 8
export const MIN_USERNAME_LENGTH = 3
export const MAX_USERNAME_LENGTH = 50
export const MAX_PASSWORD_LENGTH = 200

/**
 * Valida el formulario de registro.
 *
 * @returns {Object.<string, string>} Mensajes por campo. Vacío si todo está bien.
 */
export function validateRegistration({ username, password, passwordConfirmation }) {
  const errors = {}

  if (username.trim() === '') {
    errors.username = es.errors.usernameRequired
  } else if (username.trim().length < MIN_USERNAME_LENGTH) {
    errors.username = es.errors.usernameTooShort
  } else if (username.trim().length > MAX_USERNAME_LENGTH) {
    errors.username = es.errors.usernameTooLong
  }

  if (password === '') {
    errors.password = es.errors.passwordRequired
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = es.errors.passwordTooShort
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = es.errors.passwordTooLong
  }

  if (passwordConfirmation === '') {
    errors.passwordConfirmation = es.errors.passwordConfirmationRequired
  } else if (password !== passwordConfirmation) {
    errors.passwordConfirmation = es.errors.passwordConfirmationMismatch
  }

  return errors
}

/**
 * Valida el formulario de entrada.
 *
 * Aquí **no** se comprueba la longitud mínima de la contraseña, a propósito. Si
 * alguien que ya tiene cuenta se equivoca al teclear y escribe cinco
 * caracteres, el mensaje que necesita es «el usuario o la contraseña no son
 * correctos», no «la contraseña necesita al menos 8 caracteres». Además, un
 * mensaje distinto según el fallo es lo que permite ir anotando qué cuentas
 * existen (§6.3, R-007 de la spec 003).
 */
export function validateLogin({ username, password }) {
  const errors = {}

  if (username.trim() === '') {
    errors.username = es.errors.usernameRequired
  }

  if (password === '') {
    errors.password = es.errors.passwordRequired
  }

  return errors
}

/** Si hay algún error pendiente. */
export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}
