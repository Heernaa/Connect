import { useEffect, useState } from 'react'

import { Button } from './ui/Button.jsx'
import { StatusIndicator } from './ui/StatusIndicator.jsx'
import { es } from '../i18n/es.js'
import { fetchHealth } from '../lib/api.js'

const LOADING = 'loading'
const ONLINE = 'online'
const DEGRADED = 'degraded'
const OFFLINE = 'offline'

/**
 * Estado del servicio.
 *
 * No es solo decorativo: comprueba de verdad que el frontend llega al backend,
 * que es el requisito de arranque con un solo comando (spec 001 · R-006). Un
 * iconito verde dibujado a mano no demostraría nada.
 *
 * Cada estado lleva texto además de color, nunca solo color (§4.1, R-004):
 * aquí lo garantiza `StatusIndicator`, que pinta color, icono y frase a la vez.
 * Es el componente que Wordle tendrá que usar para las pistas de cada letra.
 */
export function ServiceStatus() {
  const [state, setState] = useState(LOADING)
  const [requestId, setRequestId] = useState(0)

  useEffect(() => {
    // El AbortController evita que la respuesta de una consulta cancelada
    // llegue después de la siguiente y pise el estado nuevo.
    const controller = new AbortController()

    fetchHealth({ signal: controller.signal })
      .then((health) => {
        if (controller.signal.aborted) return
        setState(health.status === 'ok' && health.database === 'connected' ? ONLINE : DEGRADED)
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === 'AbortError') return
        setState(OFFLINE)
      })

    return () => controller.abort()
  }, [requestId])

  const messages = {
    [LOADING]: es.service.loading,
    [ONLINE]: es.service.online,
    [DEGRADED]: es.service.databaseUnreachable,
    [OFFLINE]: es.service.offline,
  }

  // El tono es una señal **más**, nunca la única: `StatusIndicator` pone icono y
  // frase al lado. Con daltonismo, en un lector de pantalla o en una pantalla
  // en blanco y negro, el estado sigue siendo legible (R-004).
  const tones = {
    [LOADING]: 'neutral',
    [ONLINE]: 'success',
    [DEGRADED]: 'warning',
    [OFFLINE]: 'danger',
  }

  return (
    <section
      aria-labelledby="service-status"
      aria-busy={state === LOADING}
      className="ui-card"
    >
      <h2 id="service-status" className="text-xl font-semibold">
        {es.service.heading}
      </h2>

      {/*
        `aria-live="polite"`: el estado cambia solo (al comprobarlo o al
        reintentar), y quien esté leyendo otra cosa no necesita que se le corte.
      */}
      <p aria-live="polite" className="mt-3 text-lg">
        <StatusIndicator tone={tones[state]}>{messages[state]}</StatusIndicator>
      </p>

      {state === OFFLINE && <p className="mt-2 text-ink-muted">{es.service.offlineHint}</p>}

      <dl className="mt-4 grid gap-2 text-ink-muted sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{es.service.checkLabel}</dt>
          <dd>{state === OFFLINE ? es.common.unknown : state === LOADING ? es.common.loading : es.common.yes}</dd>
        </div>
        <div>
          <dt className="font-semibold">{es.service.databaseLabel}</dt>
          <dd>
            {state === ONLINE
              ? es.service.databaseConnected
              : state === DEGRADED
                ? es.service.databaseUnreachable
                : es.common.unknown}
          </dd>
        </div>
      </dl>

      {state === OFFLINE && (
        <div className="mt-5">
          <Button
            onClick={() => {
              setState(LOADING)
              setRequestId((id) => id + 1)
            }}
          >
            {es.service.retry}
          </Button>
        </div>
      )}
    </section>
  )
}

export default ServiceStatus
