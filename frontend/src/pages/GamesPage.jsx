import { useEffect, useState } from 'react'

import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { StatusIndicator } from '../components/ui/StatusIndicator.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { formatPoints } from '../i18n/socialFormat.js'
import { fetchGames } from '../lib/api.js'
import { accentFor } from '../lib/gameAccent.js'
import { routeHref } from '../routes.js'

const LOADING = 'loading'
const READY = 'ready'
const FAILED = 'failed'

/**
 * Lista de juegos (R-011).
 *
 * · Nombre y descripción los sirve la API (§2.1.2). Aquí no hay ni una palabra
 *   de juego escrita a mano: si el servidor devuelve algo que no cuadra, se
 *   avisa con un mensaje y no se pinta un `undefined` (R-013).
 * · El estado «jugado / sin jugar» se dice con **palabra e icono**, no solo con
 *   color. Es el requisito que la spec marca como obligatorio para el caso de
 *   Wordle (§2.1.4) y aquí se aplica ya, en la base, para que los juegos no
 *   tengan que reinventarlo (R-004).
 * · Se puede ver **sin iniciar sesión** (§2.4): si no hay sesión, la lista se
 *   enseña igual y ningún botón pide credenciales.
 */
export function GamesPage() {
  const [state, setState] = useState(LOADING)
  const [games, setGames] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchGames({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return

        setGames(loaded)
        setState(READY)
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return

        setErrorMessage(error.message)
        setState(FAILED)
      })

    return () => controller.abort()
  }, [reloadToken])

  /**
   * Vuelve a pedir los juegos.
   *
   * El estado de «cargando» se pone aquí, en el manejador del botón, y no
   * dentro del efecto: es el evento del botón lo que ha provocado la nueva
   * petición, así que es desde ahí desde donde se actualiza la pantalla
   * (§3.3).
   */
  const retry = () => {
    setState(LOADING)
    setErrorMessage('')
    setReloadToken((token) => token + 1)
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-display font-bold tracking-tight">{es.games.heading}</h1>
        <p className="mt-3 max-w-prose text-body text-ink-muted">{es.games.intro}</p>
      </header>

      {state === LOADING && (
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.games.loading}
        </p>
      )}

      {/*
        Un fallo de la API se enseña como lo que es: un problema para el que hay
        una acción, volver a intentarlo. Nunca como una pantalla vacía, que es lo
        que pasaría si solo se ocultara la lista (R-009, R-013).
      */}
      {state === FAILED && (
        <ErrorMessage
          title={es.errors.title}
          retryLabel={es.common.retry}
          onRetry={retry}
        >
          {errorMessage}
        </ErrorMessage>
      )}

      {state === READY && games.length === 0 && <p className="text-lg">{es.games.empty}</p>}

      {state === READY && games.length > 0 && (
        <ul className="grid list-none grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <li key={game.gameId}>
              <GameCard game={game} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Tarjeta de un juego.
 *
 * Sigue la anatomía del diseño de Figma: tarjeta redondeada, aire por dentro,
 * título grande en negrita y descripción debajo. Lo que cambia es que el color
 * va en una **banda de acento** en lugar de en el relleno, para que el anillo de
 * foco no se pierda contra el color y el texto siempre se pueda leer.
 */
function GameCard({ game }) {
  const accent = accentFor(game.gameId)

  return (
    <section
      aria-labelledby={`game-${game.gameId}`}
      className="ui-card ui-card--interactive flex h-full flex-col gap-4"
      style={{ '--card-accent': accent }}
    >
      {/*
        La banda lleva el color del juego. Es decorativa, así que va marcada
        como tal: el nombre del juego se lee en el título de al lado, y repetirlo
        aquí dentro sería ruido (R-004).
      */}
      <div className="ui-accent-band" aria-hidden="true">
        {game.name.charAt(0).toUpperCase()}
      </div>

      <div className="flex flex-col gap-2">
        <h2 id={`game-${game.gameId}`} className="text-2xl font-bold tracking-tight">
          {game.name}
        </h2>
        <p className="text-lg text-ink-muted">{game.description}</p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-3">
        {/*
          El estado y los puntos vienen **del servidor** (spec 006 · R-018). Antes
          esto decía «Sin jugar» escrito a mano para todos los juegos, con un
          comentario que lo admitía: no había forma de saber si alguien ya había
          jugado, porque la API no lo decía. Ahora `/api/games` lo devuelve y la
          lista dice la verdad.
        */}
        <StatusIndicator tone={game.played ? 'success' : 'neutral'}>
          {format(es.games.stateLabel, { state: game.played ? es.games.played : es.games.notPlayed })}
        </StatusIndicator>

        {game.score > 0 && (
          <span className="text-lg font-semibold">
            {formatPoints(game.score)}
          </span>
        )}
      </div>

      {/*
        El botón **es un enlace**. Antes era un `<button>` que no llevaba a
        ninguna parte: se pulsaba y no pasaba nada, que es un callejón sin salida
        (§2.1.6). Con `href` además se puede abrir en otra pestaña y copiar
        (R-005).
      */}
      <div>
        <a className="ui-button ui-button--primary" href={routeHref(`game/${game.gameId}`)}>
          {game.played ? es.games_ui.resume : es.games_ui.play}
        </a>
      </div>
    </section>
  )
}

export default GamesPage
