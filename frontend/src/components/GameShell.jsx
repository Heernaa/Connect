import { useState } from 'react'

import { ErrorMessage } from './ui/ErrorMessage.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { formatPoints } from '../i18n/socialFormat.js'
import { abandonGame } from '../lib/api.js'
import { routeHref } from '../routes.js'

/**
 * El esqueleto común a los tres juegos (spec 006 · R-014, R-015).
 *
 * Lo que comparten y que, si cada pantalla lo hiciera por su cuenta, se
 * acabaría haciendo tres veces y tres veces distinto:
 *
 * · **El enlace a la lista de juegos**, visible siempre. §2.1.6 dice que ninguna
 *   cuenta se queda bloqueada sin salida, y una persona a la mitad de una
 *   partida tiene que poder volver atrás sin recorrer el menú (§2.1.7).
 * · **«Salir de la partida»**, también visible siempre, y **un solo paso**: no
 *   hay diálogo. Pedir confirmación al dejar de jugar sería tratar una salida
 *   como una acción destructiva, y no lo es —salvo en Wordle, y de eso se ocupa
 *   `wordleNeedsWarning`.
 * · **El aviso de que hace falta sesión**, con el enlace a entrar. Un formulario
 *   de contraseña en medio de la pantalla de juego sería un obstáculo antes de
 *   ver nada.
 * · **Los puntos**, con palabra y no solo la cifra: «21 puntos» y no «21» (§4.2).
 *
 * @param {object} props
 * @param {string} props.gameId    El identificador del juego, para el servidor.
 * @param {string} props.heading   El nombre del juego, del diccionario.
 * @param {string} props.intro     Lo que hay que saber antes de empezar.
 * @param {number} [props.score]   Puntos acumulados, si ya se sabe.
 * @param {boolean} props.signedIn Si hay sesión abierta.
 * @param {boolean} [props.wordleNeedsWarning]
 *   Si es `true`, salir **consume la única partida** y el aviso va en el botón,
 *   antes de pulsarlo. Es la única acción del proyecto que no se puede deshacer,
 *   y por eso es la única que se avisa (§4.2, §2.1.4).
 * @param {() => void} [props.onLeft]
 *   Se llama al salir, para que la pantalla recargue el estado real. Sin esto,
 *   quien saliera de Wordle seguiría viendo el teclado.
 */
export function GameShell({
  gameId,
  heading,
  intro,
  score,
  signedIn,
  wordleNeedsWarning = false,
  onLeft,
  children,
}) {
  const [leaving, setLeaving] = useState(false)
  const [leftMessage, setLeftMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-display font-bold tracking-tight">{heading}</h1>
        <p className="max-w-prose text-lg text-ink-muted">{intro}</p>

        <p className="ui-card bg-brand-soft max-w-prose text-lg">
          {es.games_ui.signedInRequired}
        </p>

        <div className="flex flex-wrap gap-4">
          <a className="ui-button ui-button--primary" href={routeHref('login')}>
            {es.login.submit}
          </a>
          <a className="ui-button ui-button--secondary" href={routeHref('register')}>
            {es.nav.register}
          </a>
        </div>
      </div>
    )
  }

  const leave = async () => {
    setLeaving(true)
    setErrorMessage('')

    try {
      const result = await abandonGame({ gameId })

      setLeftMessage(result.message)

      if (onLeft) onLeft(result)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-display font-bold tracking-tight">{heading}</h1>
        <p className="mt-3 max-w-prose text-body text-ink-muted">{intro}</p>
      </header>

      {score !== undefined && (
        <p className="text-lg font-semibold">
          {format(es.games_ui.yourScore, { points: formatPoints(score) })}
        </p>
      )}

      {/*
        La salida y el enlace a la lista están **encima** del juego, no al final.
        En Wordle la rejilla crece hacia abajo con cada intento, y un botón al
        final quedaría cada vez más lejos del scroll: al cuarto intento ya
        estaría fuera de la pantalla (§2.1.6).
      */}
      <div className="flex flex-wrap items-center gap-3">
        <a className="ui-button ui-button--secondary" href={routeHref('games')}>
          {es.games_ui.backToGames}
        </a>

        <button
          type="button"
          className="ui-button ui-button--quiet"
          onClick={leave}
          disabled={leaving}
          // El aviso de Wordle va en `aria-describedby` del botón, no en un
          // diálogo. Un `alert` cortaría lo que alguien esté escribiendo, que
          // es justo lo que pasa si abandona a mitad.
          aria-describedby={wordleNeedsWarning ? 'leave-warning' : undefined}
        >
          {leaving ? es.games_ui.leaving : es.games_ui.leave}
        </button>
      </div>

      {wordleNeedsWarning && (
        <p id="leave-warning" className="max-w-prose text-lg text-ink-muted">
          {es.wordle.leaveWarning}
        </p>
      )}

      {leftMessage !== '' && (
        <p aria-live="polite" className="ui-card text-lg">
          {leftMessage}
        </p>
      )}

      {errorMessage !== '' && <ErrorMessage>{errorMessage}</ErrorMessage>}

      {children}
    </div>
  )
}

export default GameShell