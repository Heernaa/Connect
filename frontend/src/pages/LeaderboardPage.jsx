import { useEffect, useState } from 'react'

import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { formatPoints, withRanks } from '../i18n/socialFormat.js'
import { fetchGames, fetchLeaderboard } from '../lib/api.js'

const LOADING = 'loading'
const READY = 'ready'
const FAILED = 'failed'

/**
 * La clasificación (R-001, R-002, §2.4).
 *
 * Se ve **sin iniciar sesión**. Es una decisión de producto: quien todavía no
 * tiene cuenta puede ver que hay gente jugando, y eso es buena parte de lo que
 * le hace crearse una. El nombre de usuario no aparece en ningún sitio, y el
 * servidor tampoco lo envía (§6.5).
 *
 * La tabla es una `<table>` de verdad, no un `div` por fila. Es lo que permite
 * que un lector de pantalla anuncie «puesto 3, alias LoboTranquilo, 21 puntos»
 * en lugar de leer tres celdas sueltas sin saber a qué columna pertenecen
 * (R-006).
 */
export function LeaderboardPage() {
  const [state, setState] = useState(LOADING)
  const [gameId, setGameId] = useState('')
  const [games, setGames] = useState([])
  const [entries, setEntries] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    fetchGames({ signal: controller.signal })
      .then((loaded) => {
        if (controller.signal.aborted) return

        setGames(loaded)
      })
      .catch(() => {
        // Los nombres de los juegos son para el selector. Si no llegan, la
        // clasificación global sigue siendo útil y no se interrumpe nada: un
        // filtro que no se puede usar no es motivo para no enseñar la tabla.
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    setState(LOADING)

    fetchLeaderboard({ gameId, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return

        setEntries(result.entries)
        setState(READY)
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return

        setErrorMessage(error.message)
        setState(FAILED)
      })

    return () => controller.abort()
  }, [gameId, reloadToken])

  const retry = () => {
    setState(LOADING)
    setErrorMessage('')
    setReloadToken((token) => token + 1)
  }

  const selectedGame = games.find((game) => game.gameId === gameId)
  const rows = withRanks(entries)

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-display font-bold tracking-tight">{es.leaderboard.heading}</h1>
        <p className="mt-3 max-w-prose text-body text-ink-muted">{es.leaderboard.intro}</p>
      </header>
  {/*
        El filtro es un `fieldset` con radios y no un `select`. Un desplegable
        esconde las opciones hasta que se abre, y con teclado hay que saber que
        está ahí; los radios se ven todos de golpe y las flechas los recorren
        solos (R-005).
      */}
      <fieldset className="ui-card">
        <legend className="text-lg font-semibold">{es.leaderboard.filterLegend}</legend>

        <div className="mt-4 flex flex-col gap-3">
          <label className="ui-choice">
            <input
              type="radio"
              name="leaderboard-game"
              value=""
              checked={gameId === ''}
              onChange={() => setGameId('')}
            />
            <span>{es.leaderboard.filterAll}</span>
          </label>

          {games.map((game) => (
            <label key={game.gameId} className="ui-choice">
              <input
                type="radio"
                name="leaderboard-game"
                value={game.gameId}
                checked={gameId === game.gameId}
                onChange={() => setGameId(game.gameId)}
              />
              <span>{game.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state === LOADING && (
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.leaderboard.loading}
        </p>
      )}

      {state === FAILED && (
        <ErrorMessage
          title={es.errors.title}
          retryLabel={es.common.retry}
          onRetry={retry}
        >
          {errorMessage}
        </ErrorMessage>
      )}

      {state === READY && entries.length === 0 && (
        <p className="text-lg">{es.leaderboard.empty}</p>
      )}

      {state === READY && entries.length > 0 && (
        <LeaderboardTable rows={rows} gameName={selectedGame?.name} />
      )}
    </div>
  )
}

/**
 * La tabla de la clasificación.
 *
 * `gameName` va en el `<caption>` cuando se está viendo un solo juego: es el
 * título de la tabla y sin él una persona que usa lector de pantalla oiría
 * «Puesto, Alias, Puntos» sin saber de qué juego es la lista.
 */
function LeaderboardTable({ rows, gameName }) {
  const caption = gameName
    ? format(es.leaderboard.captionGame, { game: gameName })
    : es.leaderboard.captionGlobal

  // El contenedor con `overflow-x-auto` es lo que permite que la tabla se
  // pueda desplazar en horizontal **dentro de su propia caja** en móvil, en
  // lugar de arrastrar la página entera. Sin esto, una tabla en un móvil de
  // 360px produciría scroll horizontal en el documento, que es exactamente lo
  // que R-010 prohíbe.
  return (
    /*
     * `tabIndex` y `role="region"` no son adorno. En móvil (360px) esta caja es
     * la que se desplaza en horizontal para que la tabla no arrastre la página
     * (R-010), y una caja con contenido desplazable a la que **no se puede llegar
     * con el teclado** es contenido que solo alcanza quien usa ratón o pantalla
     * táctil: WCAG 2.1.1, y axe lo marca como `scrollable-region-focusable`.
     *
     * Con nombre accesible (`aria-label`) el lector de pantalla anuncia de qué
     * región se trata al entrar en ella, que es lo que hace falta para saber que
     * se puede desplazar.
     */
    <div aria-label={es.leaderboard.scrollRegion} className="ui-table-scroll" role="region" tabIndex={0}>
      <table className="ui-table">
        <caption>{caption}</caption>

        <thead>
          <tr>
            <th scope="col">{es.leaderboard.rankHeading}</th>
            <th scope="col">{es.leaderboard.aliasHeading}</th>
            <th scope="col">{es.leaderboard.pointsHeading}</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.alias}>
              <th scope="row">{row.rank}</th>
              <td>{row.alias}</td>
              <td>{formatPoints(row.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderboardPage