import { useState } from 'react'

import { Button } from './ui/Button.jsx'
import { ErrorMessage } from './ui/ErrorMessage.jsx'
import { es } from '../i18n/es.js'
import { deleteAccount } from '../lib/api.js'

const CLOSED = 'closed'
const OPEN = 'open'
const DELETING = 'deleting'
const FAILED = 'failed'

/**
 * Borrar la cuenta (R-010, §6.5).
 *
 * Aquí **sí** se pide confirmación, y es la única excepción en todo el producto.
 * El bloqueo no la pide porque el momento de pulsarlo es justo cuando te están
 * molestando (R-006). Borrar la cuenta, en cambio, es una decisión que se toma
 * con la cabeza fría y cuyo error no se arregla: si alguien entra en la pantalla
 * de borrar y pulsa sin querer, pierde sus partidas y sus puntos para siempre.
 *
 * Las dos diferencias con el bloqueo, y las dos importan:
 *
 * · El aviso dice **qué se pierde** y que **no hay vuelta atrás**, antes de
 *   confirmar (§4.2). Un botón que hace algo irreparable sin decir qué hace es un
 *   dark pattern (§6.4).
 * · Dice que **no hay copia**. No decirlo dejaría pensar lo contrario, que es
 *   exactamente el tipo de etiqueta engañosa que §6.4 prohíbe.
 *
 * No hay exportación de datos: es deuda técnica registrada en §11. Por eso el
 * aviso no promete una copia y no la hay.
 */
export function DeleteAccountPanel({ session }) {
  const [state, setState] = useState(CLOSED)
  const [errorMessage, setErrorMessage] = useState('')

  const confirm = async () => {
    setState(DELETING)
    setErrorMessage('')

    try {
      await deleteAccount()

      // La sesión local se limpia solo cuando el servidor confirma. Si no
      // confirma, se conserva el estado: sería peor quedarse fuera de la cuenta
      // sin haber borrado nada.
      session.setUser(null)
    } catch (error) {
      setErrorMessage(error.message)
      setState(FAILED)
    }
  }

  if (state === CLOSED) {
    return (
      <button
        type="button"
        className="ui-button ui-button--quiet"
        onClick={() => setState(OPEN)}
      >
        {es.deleteAccount.action}
      </button>
    )
  }

  return (
    <div
      className="ui-card w-full border-danger"
      role="group"
      aria-label={es.deleteAccount.warningTitle}
    >
      <h2 className="text-lg font-bold">{es.deleteAccount.warningTitle}</h2>

      <p className="text-lg">{es.deleteAccount.warning}</p>
      <p className="text-lg font-semibold">{es.deleteAccount.noBackup}</p>

      {errorMessage !== '' && (
        <ErrorMessage title={es.errors.title}>{errorMessage}</ErrorMessage>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <Button variant="danger" onClick={confirm} disabled={state === DELETING}>
          {state === DELETING ? es.deleteAccount.confirming : es.deleteAccount.confirm}
        </Button>

        {/*
          Cancelar devuelve a su sitio sin preguntar nada más. Es la salida que
          tiene que ser igual de fácil de encontrar como la entrada: si cancelar
          costara un paso más que confirmar, nadie cancelaría.
        */}
        <Button
          variant="secondary"
          onClick={() => {
            setState(CLOSED)
            setErrorMessage('')
          }}
          disabled={state === DELETING}
        >
          {es.common.cancel}
        </Button>
      </div>
    </div>
  )
}

export default DeleteAccountPanel