import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { es } from '../i18n/es.js'
import { POLL_INTERVAL_MS, useChatPolling } from './useChatPolling.js'
import { act, renderHook, waitFor } from '@testing-library/react'

/**
 * El polling del chat (R-003).
 *
 * El requisito que más se puede romper sin que nadie se entere es **este**: que
 * se pare con la pestaña oculta y que no secuestre el foco. Los dos se comprueban
 * aquí midiendo el reloj, no leyendo el código.
 */

/**
 * Un mensaje con la forma **exacta** que devuelve el servidor.
 *
 * Se construye con todos los campos a propósito: los validadores del cliente
 * (R-013) rechazan lo que no cuadra, así que una fixture incompleta fallaría en
 * el validador y el test mediría otra cosa distinta de la que dice medir.
 */
function message(id, body, extra = {}) {
  return {
    message_id: id,
    author_id: 1,
    alias: 'LoboTranquilo',
    body,
    kind: 'user',
    created_at: '2026-10-16T12:00:00Z',
    is_mine: false,
    ...extra,
  }
}

/** Un mensaje ya pasado por el validador del cliente, como lo entrega la API. */
function parsed(id, body) {
  return {
    messageId: id,
    authorId: 1,
    alias: 'LoboTranquilo',
    body,
    kind: 'user',
    createdAt: '2026-10-16T12:00:00Z',
    isMine: false,
  }
}

/** Una respuesta de la API con mensajes y marca de tiempo. */
function response(messages, pollFrom = '2026-10-16T12:00:00Z') {
  return { messages, poll_from: pollFrom }
}

/** Sustituye a `fetch` y devuelve lo que haría en cada llamada. */
function stubFetch(responses = []) {
  let call = 0

  const fetchMock = vi.fn(() => {
    const index = Math.min(call, responses.length - 1)
    call += 1

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responses[index] ?? response([])),
    })
  })

  vi.stubGlobal('fetch', fetchMock)

  return fetchMock
}

/**
 * Cambia la visibilidad de la pestaña.
 *
 * `document.visibilityState` es de solo lectura en jsdom: hay que redefinir la
 * propiedad entera. Se hace en un sitio para que los tests lean como el
 * requisito y no como la mecánica de jsdom.
 */
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  setVisibility('visible')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useChatPolling', () => {
  it('el intervalo son diez segundos', () => {
    // §0.1, decidido el 2026-10-16.
    expect(POLL_INTERVAL_MS).toBe(10000)
  })

  it('carga los mensajes al abrirse', async () => {
    stubFetch([response([message(1, 'hola')])])

    const { result } = renderHook(() => useChatPolling({ enabled: true }))

    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    expect(result.current.status).toBe('ready')
  })

  it('no consulta nada si está desactivado', async () => {
    const fetchMock = stubFetch()

    const { result } = renderHook(() => useChatPolling({ enabled: false }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.status).toBe('idle')
  })

  it('consulta otra vez cada diez segundos', async () => {
    const fetchMock = stubFetch()

    renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('se para cuando la pestaña deja de estar a la vista (R-003)', async () => {
    // Es el requisito que ahorra batería: si nadie está mirando, no hace falta
    // descargar nada cada diez segundos.
    const fetchMock = stubFetch()

    renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    setVisibility('hidden')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 5)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('consulta en el acto al volver a la pestaña, sin esperar al intervalo', async () => {
    // Volver a mirar y esperar otros diez segundos es justo lo que hace que un
    // chat parezca lento.
    const fetchMock = stubFetch()

    renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    setVisibility('visible')
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('trae solo lo nuevo: manda la marca de la consulta anterior (R-003)', async () => {
    const fetchMock = stubFetch([
      response([], '2026-10-16T12:00:00Z'),
      response([], '2026-10-16T12:00:10Z'),
    ])

    renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    const [primeraUrl] = fetchMock.mock.calls[0]

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    // `fetch` se llama con `(url, opciones)`, así que la marca va en la URL: es
    // un parámetro de consulta, no una cabecera.
    const [segundaUrl] = fetchMock.mock.calls[1]

    // La primera consulta **no lleva marca**: no hay ninguna anterior. Si
    // llevara, la segunda pediría mensajes que ya se leyeron y el polling
    // empezaría a saltarse cosas.
    expect(primeraUrl).toBe('/api/chat/messages')
    expect(segundaUrl).toBe('/api/chat/messages?since=2026-10-16T12%3A00%3A00Z')
  })

  it('cuenta los mensajes nuevos aparte de la lista (R-003)', async () => {
    // Es lo que permite que la pantalla decida si interrumpe a quien está
    // leyendo, en lugar de moverle la lista sin avisar.
    stubFetch([
      response([message(1, 'primero')], '2026-10-16T12:00:00Z'),
      response([message(2, 'segundo')], '2026-10-16T12:00:10Z'),
    ])

    const { result } = renderHook(() => useChatPolling({ enabled: true }))

    await waitFor(() => expect(result.current.messages).toHaveLength(1))
    expect(result.current.pendingCount).toBe(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    expect(result.current.pendingCount).toBe(1)
  })

  it('un fallo de red no para el polling', async () => {
    // Si el fallo apagara el intervalo, el chat quedaría congelado para siempre
    // con el aviso de error puesto.
    let call = 0

    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        call += 1

        if (call === 2) return Promise.reject(new Error('sin red'))

        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(response([], `2026-10-16T12:00:0${call}Z`)),
        })
      }),
    )

    const { result } = renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    // El fallo de red se enseña con el mensaje del diccionario, no con el del
    // error técnico (R-009): quien lo lee no puede arreglar un `TypeError`.
    await waitFor(() => expect(result.current.errorMessage).toBe(es.errors.chatUnavailable))

    // La consulta siguiente se hace igual: el error no apaga nada.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    })

    await waitFor(() => expect(result.current.errorMessage).toBe(''))
  })

  it('un fallo en la primera carga sí avisa (R-013)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('sin servidor'))))

    const { result } = renderHook(() => useChatPolling({ enabled: true }))

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.errorMessage).toBe(es.errors.chatUnavailable)
  })

  it('añade al final el mensaje que se acaba de enviar', async () => {
    stubFetch([response([message(1, 'antes')])])

    const { result } = renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    act(() => {
      result.current.appendMessage(parsed(2, 'el mío'))
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(2))
    // Al final, porque es lo último que se ha escrito.
    expect(result.current.messages[1].body).toBe('el mío')
  })

  it('no duplica el mensaje si ya estaba en la lista', async () => {
    // Vuelve con la siguiente consulta del polling; si se añadiera otra vez,
    // aparecería dos veces seguidas en pantalla.
    stubFetch([response([message(1, 'hola')])])

    const { result } = renderHook(() => useChatPolling({ enabled: true }))
    await waitFor(() => expect(result.current.messages).toHaveLength(1))

    // Lo que se devuelve al enviar ya viene **parseado** por el cliente de la API,
    // con `messageId` en camelCase; lo que llega por polling viene de `parse`
    // con el mismo criterio. Por eso la comparación funciona.
    act(() => {
      result.current.appendMessage(parsed(1, 'hola'))
    })

    expect(result.current.messages).toHaveLength(1)
  })
})