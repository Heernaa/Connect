import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchChatMessages } from '../lib/api.js'

/**
 * Cuánto se espera entre consulta y consulta (§0.1, decided el 2026-10-16).
 *
 * Diez segundos es un compromiso: lo bastante corto para que una conversación
 * se sienta viva, y lo bastante largo para no gastar la batería de alguien que
 * tiene el móvil en la mesilla. Por eso además **se para cuando la pestaña no
 * está a la vista**: si nadie la está mirando, la batería se gasta en avisar a
 * nadie.
 */
export const POLL_INTERVAL_MS = 10000

/**
 * Consulta el chat periódicamente (R-003).
 *
 * Lo que este hook resuelve, y que es lo difícil de este requisito:
 *
 * · **Se para con la pestaña oculta.** Se usa `visibilitychange`, no un simple
 *   `setInterval` que sigue corriendo en segundo plano. Al volver a la pestaña
 *   se consulta **en el acto**, no se espera al siguiente tick: quien lleva una
 *   hora con la pestaña en segundo plano no quiere esperar diez segundos más.
 *
 * · **Trae solo lo nuevo.** Se manda la marca de la última consulta. En una
 *   conversación larga, descargar todo cada diez segundos sería tirar la
 *   conexión y la batería para releer lo mismo.
 *
 * · **No secuestra el foco ni hace scroll brusco** (R-003, §4.1). Este hook no
 *   toca el DOM en absoluto: solo dice qué mensajes hay. Quién decide si eso
 *   interrumpe es la pantalla, y lo hace comprobando si quien está leyendo está
 *   al final de la conversación o más arriba. Mover el foco mientras alguien
 *   escribe sería peor que un scroll: le haría perder lo que estaba escribiendo.
 *
 * · **Un fallo de red no para el polling.** Un `catch` que no apaga el intervalo
 *   dejaría el chat congelado para siempre con el mensaje de error puesto.
 *   Siguiente consulta, siguiente oportunidad.
 */
export function useChatPolling({ enabled }) {
  const [messages, setMessages] = useState([])
  const [status, setStatus] = useState(enabled ? 'loading' : 'idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [pendingCount, setPendingCount] = useState(0)

  // La marca de la última consulta en una ref, no en el estado: es un dato que
  // se usa y se actualiza dentro de la misma función asíncrona, y si estuviera
  // en el estado, dos mensajes que llegan juntos partirían de la misma marca y
  // el segundo se perdería.
  const markerRef = useRef('')

  const load = useCallback(async ({ signal, isFirst }) => {
    try {
      const result = await fetchChatMessages({
        ...(signal ? { signal } : {}),
        ...(markerRef.current === '' ? {} : { since: markerRef.current }),
      })

      if (signal?.aborted) return

      markerRef.current = result.pollFrom

      if (result.messages.length === 0) {
        // No hay nada nuevo. **No** se toca `messages`: reconstruir el arreglo
        // en cada consulta volvería a pintar todos los mensajes y, con ello, a
        // perder la posición de lectura.
        setPendingCount(0)
      } else if (isFirst) {
        // La primera carga es la conversación entera: se pinta sin preguntar,
        // porque quien abre el chat sí quiere leerlo.
        setMessages(result.messages)
        setPendingCount(0)
      } else {
        // Mensajes nuevos mientras se está leyendo. Se **suman al final** sin
        // quitar los viejos, y se cuentan aparte para que la pantalla decida si
        // interrumpe.
        setMessages((current) => [...current, ...result.messages])
        setPendingCount((count) => count + result.messages.length)
      }

      setStatus('ready')
      setErrorMessage('')
    } catch (error) {
      if (error.name === 'AbortError' || signal?.aborted) return

      setErrorMessage(error.message)
      // El estado pasa a `failed` solo en la primera carga. Si ya se estaba
      // leyendo, se deja la conversación a la vista y el aviso va aparte: tapar
      // lo que alguien estaba leyendo porque la red ha ido y viene sería peor
      // que el fallo.
      setStatus(isFirst ? 'failed' : 'ready')
    }
  }, [])

  // Carga inicial y reinicio. Cambia con `enabled` para que, al iniciar
  // sesión en otra pestaña, se vuelva a leer desde el principio en vez de
  // quedarse con la lista vacía del modo espectador.
  useEffect(() => {
    if (!enabled) {
      setMessages([])
      setStatus('idle')
      setPendingCount(0)
      markerRef.current = ''
      return undefined
    }

    const controller = new AbortController()

    setStatus('loading')
    load({ signal: controller.signal, isFirst: true })

    return () => controller.abort()
  }, [enabled, load])

  // El intervalo, y su pausa cuando la pestaña no está a la vista.
  useEffect(() => {
    if (!enabled || status === 'failed') return undefined

    const controller = new AbortController()

    const tick = () => load({ signal: controller.signal, isFirst: false })

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return

      tick()
    }, POLL_INTERVAL_MS)

    // Al volver a la pestaña se consulta en el acto. Sin esto, quien la dejó en
    // segundo plano un rato se encontraría con hasta diez segundos de retraso
    // justo cuando acaba de mirar la pantalla.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') tick()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      controller.abort()
    }
  }, [enabled, status, load])

  /** Marca los mensajes nuevos como ya vistos y limpia el contador. */
  const clearPending = useCallback(() => {
    setPendingCount(0)
  }, [])

  /**
   * Añade un mensaje que se acaba de enviar.
   *
   * Sin esto habría que esperar hasta diez segundos al siguiente polling, que
   * es lo que hace que un chat se sienta lento cuando más impatience da: justo
   * después de pulsar enviar.
   *
   * No se cuela en la lista de «pendientes» que hay que ir a ver: lo ha escrito
   * esta misma persona, no hay ninguna sorpresa que avisar.
   */
  const appendMessage = useCallback((message) => {
    setMessages((current) => (current.some((item) => item.messageId === message.messageId) ? current : [...current, message]))
  }, [])

  return {
    messages,
    status,
    errorMessage,
    pendingCount,
    clearPending,
    appendMessage,
    reload: load,
  }
}

export default useChatPolling