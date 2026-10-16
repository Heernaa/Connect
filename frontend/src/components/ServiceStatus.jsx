import { useEffect, useState } from 'react'

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
 * Cada estado lleva texto además de color, nunca solo color (§4.1).
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

  // Icono + texto. El icono es una señal redundante, nunca la única: con
  // daltonismo o en un lector de pantalla el texto sigue estando (§4.1).
  const icons = {
    [LOADING]: '…',
    [ONLINE]: '✓',
    [DEGRADED]: '!',
    [OFFLINE]: '✕',
  }

  const tones = {
    [LOADING]: 'text-ink-muted',
    [ONLINE]: 'text-success',
    [DEGRADED]: 'text-danger',
    [OFFLINE]: 'text-danger',
  }

  return (
    <section
      aria-labelledby="estado-servicio"
      aria-busy={state === LOADING}
      className="rounded-card border border-border-soft bg-surface p-6"
    >
      <h2 id="estado-servicio" className="text-xl font-semibold">
        {es.service.heading}
      </h2>

      <p aria-live="polite" className={`mt-3 flex items-center gap-3 text-lg font-semibold ${tones[state]}`}>
        <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-full border border-current text-base">
          {icons[state]}
        </span>
        <span>{messages[state]}</span>
      </p>

      {state === OFFLINE && <p className="mt-2 text-ink-muted">{es.service.offlineHint}</p>}

      <dl className="mt-4 grid gap-2 text-ink-muted sm:grid-cols-2">
        <div>
          <dt className="font-semibold">{es.service.checkLabel}</dt>
          <dd>{state === OFFLINE ? '—' : state === LOADING ? '…' : 'Sí'}</dd>
        </div>
        <div>
          <dt className="font-semibold">{es.service.databaseLabel}</dt>
          <dd>{state === ONLINE ? es.service.databaseConnected : state === DEGRADED ? es.service.databaseUnreachable : '—'}</dd>
        </div>
      </dl>

      {state === OFFLINE && (
        <button
          type="button"
          className="ui-button ui-button--primary mt-5"
          onClick={() => {
            setState(LOADING)
            setRequestId((id) => id + 1)
          }}
        >
          {es.service.retry}
        </button>
      )}
    </section>
  )
}