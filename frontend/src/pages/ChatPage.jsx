import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { TextArea } from '../components/ui/TextArea.jsx'
import { useChatPolling } from '../hooks/useChatPolling.js'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import {
  formatCounter,
  formatMessageTime,
  isOverLimit,
  isSystemMessage,
  uniqueMessages,
} from '../i18n/socialFormat.js'
import { fetchChatLimits, sendChatMessage, setBlocked } from '../lib/api.js'

const WRITING = 'writing'
const SENDING = 'sending'
const FAILED = 'failed'

/** Píxeles de margen para considerar que se está leyendo el final. */
const BOTTOM_MARGIN_PX = 40

/**
 * El chat (spec 007).
 *
 * Es la pantalla con más requisitos que se cumplen a la vez, y dos de ellos
 * chocan entre sí:
 *
 * · **Llegan mensajes solos**, cada diez segundos, mientras la persona puede
 *   estar escribiendo (R-003).
 * · **No se le puede interrumpir** (§4.1, §2.3). Si al llegar un mensaje se
 *   moviera el foco, quien estuviera a medio escribir perdería lo que llevaba.
 *
 * Cómo se resuelven: el polling **no toca el foco ni desplaza la lista** por su
 * cuenta. Solo añade mensajes al final. Y luego decide quien lee: si ya estaba
 * al final, la lista baja sola; si estaba más arriba releyendo, aparece un
 * botón «Ver los mensajes nuevos» y **la lista no se mueve**. Mover el foco
 * mientras alguien escribe es peor que un desplazamiento.
 */
export function ChatPage({ signedIn }) {
  const {
    messages,
    status,
    errorMessage,
    pendingCount,
    clearPending,
    appendMessage,
    reload,
  } = useChatPolling({ enabled: signedIn })

  const [draft, setDraft] = useState('')
  const [writeState, setWriteState] = useState(WRITING)
  const [sendError, setSendError] = useState('')
  const [limits, setLimits] = useState({ maxLength: 500 })
  const [blockedIds, setBlockedIds] = useState([])
  const [notice, setNotice] = useState('')

  const listRef = useRef(null)
  const wasAtBottom = useRef(true)
  const lastCount = useRef(0)
  const draftRef = useRef(null)

  // Los límites son del servidor (§2.4). El contador de la pantalla tiene que
  // enseñar los mismos números que comprueba el servidor, o contaría una cosa y
  // se aceptaría otra.
  useEffect(() => {
    if (!signedIn) return undefined

    const controller = new AbortController()

    fetchChatLimits({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return

        setLimits(result)
      })
      .catch(() => {
        // Si no se sabe el límite se usa el de por defecto. Es peor no tener
        // contador que bloquear a alguien sin avisarle.
      })

    return () => controller.abort()
  }, [signedIn])

  /**
   * Si quien lee estaba al final de la conversación.
   *
   * Se comprueba en el manejador del scroll, **antes** de que lleguen los
   * mensajes, y el resultado se guarda. Mirarlo después de insertar ya no
   * serviría: el final se ha movido y siempre parecería que estaba al final.
   *
   * El margen perdona el redondeo del navegador y que el alto varíe un poco
   * entre pantallas distintas.
   */
  const trackScroll = useCallback(() => {
    const element = listRef.current

    if (!element) return

    wasAtBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_MARGIN_PX
  }, [])

  // Al llegar mensajes nuevos: bajar **solo** si quien leía estaba al final.
  useEffect(() => {
    const grew = messages.length > lastCount.current

    lastCount.current = messages.length

    if (!grew || !wasAtBottom.current) return

    // `scrollTop` directo y no un desplazamiento suave: mover la página con
    // animação puede marear, y `prefers-reduced-motion` no es el sitio donde
    // decidir si *esta* pantalla lo necesita (§4.1).
    const element = listRef.current

    if (element) element.scrollTop = element.scrollHeight
  }, [messages])

  const submit = async (event) => {
    event.preventDefault()

    const body = draft.trim()

    if (body === '' || isOverLimit(body.length, limits.maxLength)) return

    setWriteState(SENDING)
    setSendError('')

    try {
      const saved = await sendChatMessage({ body })

      // El mensaje se enseña **en cuanto**, sin esperar al siguiente polling.
      // Al volver con la marca ya actualizada, la consulta lo traerá otra vez y
      // `uniqueMessages` descarta el duplicado.
      appendMessage(saved)
      setDraft('')
      setWriteState(WRITING)
      wasAtBottom.current = true
    } catch (error) {
      // El mensaje del servidor se enseña tal cual: si el chat no admite
      // enlaces, el texto que lo explica está escrito para quien lo lee (R-009).
      setSendError(error.message)
      setWriteState(FAILED)
    }
  }

  const toggleBlock = async (message) => {
    const alreadyBlocked = blockedIds.includes(message.authorId)

    // El cambio se pinta antes de llamar al servidor. El bloqueo tiene que
    // sentirse inmediato (R-006): esperar a la respuesta haría que el botón
    // pareciera roto justo cuando alguien lo necesita.
    setBlockedIds((current) =>
      alreadyBlocked
        ? current.filter((id) => id !== message.authorId)
        : [...current, message.authorId],
    )

    try {
      await setBlocked({ userId: message.authorId, blocked: !alreadyBlocked })

      setNotice(
        format(alreadyBlocked ? es.block.unblockedNow : es.block.blockedNow, { alias: message.alias }),
      )

      // El conjunto de mensajes visibles cambia, así que hay que volver a
      // preguntar. Es también lo que hace que el bloqueo se note al instante,
      // sin esperar al siguiente tick de diez segundos.
      reload()
    } catch {
      // Si el servidor no confirma, se deshace el cambio en pantalla: es mejor
      // que el botón vuelva a su estado anterior a que aparentar un bloqueo que
      // no existe.
      setBlockedIds((current) =>
        alreadyBlocked
          ? [...current, message.authorId]
          : current.filter((id) => id !== message.authorId),
      )
    }
  }

  const goToNewMessages = () => {
    wasAtBottom.current = true
    clearPending()

    const element = listRef.current

    if (element) element.scrollTop = element.scrollHeight
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-display font-bold tracking-tight">{es.chat.heading}</h1>
  {/*
          Se explica y se enlaza a entrar. No se pone un formulario de acceso en
          medio de la pantalla: quien llega aquí quiere leer, y encontrarse un
          formulario de contraseña antes de ver un solo mensaje es un obstáculo
          (§4.2).
        */}
        <p className="ui-card bg-brand-soft max-w-prose text-lg">{es.chat.requiresSession}</p>

        <p className="text-lg">
          {es.login.noAccount}{' '}
          <a className="ui-link" href="#/login">
            {es.login.submit}
          </a>
        </p>
      </div>
    )
  }

  const visible = uniqueMessages(messages)

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-display font-bold tracking-tight">{es.chat.heading}</h1>
        <p className="mt-3 max-w-prose text-body text-ink-muted">{es.chat.intro}</p>
      </header>

      {/*
        El aviso de lo que acabas de hacer va en **un solo** elemento, visible y
        con `aria-live="polite"`.

        Son dos cosas en uno a propósito. Lo visible es para quien lee la
        pantalla, y el `aria-live` es para quien no ve que ha pasado algo. Si
        fueran dos elementos —uno oculto para el lector de pantalla y otro
        visible—, el aviso se leería **dos veces**: es lo que hace un `role="log"`
        con una copia `sr-only` al lado, y suena a que la aplicación se repite.

        Y es `polite`, no `alert`: no pide ninguna acción inmediata, y un `alert`
        cortaría lo que alguien esté leyendo en ese momento (§4.1).
      */}
      {notice !== '' && (
        <p aria-live="polite" className="ui-card text-lg">
          {notice}
        </p>
      )}

      {status === 'loading' && (
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.common.loading}
        </p>
      )}

      {status === 'failed' && (
        <ErrorMessage
          title={es.errors.title}
          retryLabel={es.common.retry}
          onRetry={() => reload()}
        >
          {errorMessage}
        </ErrorMessage>
      )}

      {/*
        `role="log"` en lugar de un `aria-live` suelto: la función de esta
        región es «esto crece solo y hay que poder volver a leerlo». Con `log`,
        un lector de pantalla anuncia lo que llega **sin mover el foco**, que es
        exactamente lo que pide R-003.

        `tabIndex={0}` porque la zona se puede desplazar y sin esto no sería
        alcanzable con teclado: quien no usa ratón no podría volver arriba (R-005).
      */}
      <div className="ui-card flex flex-col gap-4">
        <h2 className="text-xl font-bold">{es.chat.messagesHeading}</h2>

        <div
          className="ui-chat-list"
          ref={listRef}
          onScroll={trackScroll}
          role="log"
          aria-label={es.chat.messagesHeading}
          aria-live="polite"
          aria-relevant="additions"
          tabIndex={0}
        >
          {visible.length === 0 && status === 'ready' && (
            <p className="text-lg text-ink-muted">{es.chat.empty}</p>
          )}

          {visible.map((message) => (
            <ChatMessageRow
              key={message.messageId}
              message={message}
              canBlock={!message.isMine && !isSystemMessage(message) && message.authorId !== null}
              blocked={blockedIds.includes(message.authorId)}
              onToggleBlock={toggleBlock}
            />
          ))}
        </div>

        {/*
          El botón aparece **en lugar de** mover la lista. Con el foco donde
          está quien lee, un desplazamiento lo arrastraría fuera de donde
          estaba escribiendo.
        */}
        {pendingCount > 0 && (
          <Button onClick={goToNewMessages} variant="secondary">
            {pendingCount === 1
              ? es.chat.newMessage
              : format(es.chat.newMessages, { count: pendingCount })}
          </Button>
        )}

        <form className="flex flex-col gap-4 border-t border-border-soft pt-4" onSubmit={submit} noValidate>
          <TextArea
            label={es.chat.writeLabel}
            hint={format(es.chat.writeHint, { count: limits.maxLength })}
            name="message"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (writeState === FAILED) setWriteState(WRITING)
            }}
            placeholder={es.chat.writePlaceholder}
            disabled={writeState === SENDING}
            inputRef={draftRef}
          />

          {/*
            El contador es `polite` y **no es un error hasta pasarse**. Antes de
            eso solo avisa; pasarse sí impide enviar. Un contador que gritara
            «error» al llegar a 499 letras sería un ruido constante.
          */}
          <p
            className="text-lg text-ink-muted"
            aria-live="polite"
            data-over-limit={isOverLimit(draft.length, limits.maxLength) ? 'true' : 'false'}
          >
            {formatCounter(draft.length, limits.maxLength)}
          </p>

          {sendError !== '' && <ErrorMessage>{sendError}</ErrorMessage>}

          <div className="flex flex-wrap gap-4">
            <Button
              type="submit"
              disabled={writeState === SENDING || isOverLimit(draft.length, limits.maxLength)}
            >
              {writeState === SENDING ? es.chat.sending : es.chat.send}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Un mensaje del chat, con su autor, su hora y —si es de otra persona— el botón
 * de bloquear.
 */
function ChatMessageRow({ message, canBlock, blocked, onToggleBlock }) {
  const system = isSystemMessage(message)

  // `data-system` no es adorno: `e2e/rules.spec.js` lo usa para comprobar que
  // los mensajes del sistema se distinguen **sin color**, porque un color
  // distinto no lo ve quien no distingue colores (R-004, §6.4).
  return (
    <article className="ui-chat-message" data-system={system ? 'true' : 'false'}>
      <p className="text-lg font-semibold">
        {system ? es.chat.systemLabel : message.alias}
        {!system && message.isMine && (
          <span className="text-ink-muted"> · {es.chat.mineLabel}</span>
        )}
      </p>

      <p className="text-lg">{message.body}</p>

      {/*
        La hora va en `<time datetime>` con dentro el texto que se ve. El
        `datetime` lleva la marca completa y lo que se lee es la hora corta
        (§3.1: el identificador es técnico; el rótulo es para la persona).
      */}
      <p className="text-sm text-ink-muted">
        <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
      </p>

      {canBlock && (
        <button
          type="button"
          className="ui-link"
          onClick={() => onToggleBlock(message)}
          aria-label={format(blocked ? es.block.undoLabel : es.block.actionLabel, { alias: message.alias })}
        >
          {blocked ? es.block.undo : es.block.action}
        </button>
      )}
    </article>
  )
}

export default ChatPage