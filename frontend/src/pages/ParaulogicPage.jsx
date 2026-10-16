import { useCallback, useEffect, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { GameShell } from '../components/GameShell.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import {
  fetchParaulogicContent,
  fetchParaulogicHint,
  fetchParaulogicSession,
  submitParaulogicWord,
} from '../lib/api.js'

const GAME_ID = 'paraulogic'

/**
 * Paraulógic (spec 006 · R-014, R-016).
 *
 * Tres cosas que este juego tiene que decir **siempre**, y que son la diferencia
 * entre «un juego» y «un juego para alguien mayor»:
 *
 * · **No se puede perder** (§2.1.4). No hay intentos, no hay contador de fallos y
 *   no hay estado de derrota. Escribir una palabra que no está no hace nada: ni
 *   resta, ni avisa con mala cara, ni acerca a un final. Por eso el mensaje de
 *   error dice «prueba otra» y no «incorrecto».
 * · **Pedir pista no resta puntos** (§2.1.5). Está escrito en el propio botón, no
 *   en una letra pequeña: quien tema que la ayuda le cueste algo —y a esta edad
 *   es un miedo razonable— no la pediría.
 * · **Volver no es empezar de cero** (§2.1.7). Al entrar se recuperan las
 *   palabras ya encontradas y se dice que no es la primera vez. Nadie debería
 *   reencontrar lo que ya encontró por haber cerrado el navegador.
 *
 * El contador de pendientes **baja** con cada palabra. Un contador que dijera
 * «21 palabras» mientras llevas 15 encontradas sería verdad y no serviría de
 * nada: lo que se quiere saber es cuánto queda.
 */
export function ParaulogicPage({ signedIn }) {
  const [letters, setLetters] = useState('')
  const [found, setFound] = useState([])
  const [pending, setPending] = useState(0)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const [draft, setDraft] = useState('')
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const [hint, setHint] = useState(null)
  const [askingHint, setAskingHint] = useState(false)

  /**
   * Carga las letras y el progreso guardado.
   *
   * Van en dos peticiones porque son dos cosas: las letras son públicas y el
   * progreso es de la cuenta. Se piden a la vez, no en serie: esperarse a una
   * para pedir la otra es medio segundo de pantalla vacía por partida abierta.
   */
  const load = useCallback(async () => {
    setStatus('loading')

    const [content, session] = await Promise.all([
      fetchParaulogicContent(),
      fetchParaulogicSession(),
    ])

    setLetters(content.letters)
    setPending(session.pendingCount)
    setFound(session.foundWords)
    setScore(session.score)
    setStatus('ready')
  }, [])

  useEffect(() => {
    if (!signedIn) return undefined

    let cancelled = false

    load().catch((error) => {
      if (cancelled) return

      setErrorMessage(error.message)
      setStatus('failed')
    })

    return () => {
      cancelled = true
    }
  }, [signedIn, load])

  const submit = async (event) => {
    event.preventDefault()

    const word = draft.trim()

    if (word === '') return

    setChecking(true)
    setFeedback(null)
    setErrorMessage('')

    try {
      const result = await submitParaulogicWord({ word })

      if (result.isCorrect) {
        // La palabra viene del servidor: el cliente no la «adivina» ni la
        // escribe por su cuenta (§2.1.2).
        setFound((current) => [...current, result.correctWord])
        setPending((current) => Math.max(0, current - 1))
        setFeedback({ kind: 'correct', word: result.correctWord })
        setDraft('')
      } else {
        setFeedback({ kind: 'incorrect' })
      }

      setScore(result.score)
    } catch (error) {
      // El motivo del servidor («esa palabra usa la letra X, que no está») se
      // enseña tal cual: está escrito para quien lo va a leer (R-009).
      setErrorMessage(error.message)
    } finally {
      setChecking(false)
    }
  }

  const askHint = async () => {
    setAskingHint(true)
    setErrorMessage('')

    try {
      setHint(await fetchParaulogicHint())
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setAskingHint(false)
    }
  }

  if (status === 'loading') {
    return (
      <GameShell
        gameId={GAME_ID}
        heading={es.paraulogic.heading}
        intro={es.paraulogic.intro}
        signedIn={signedIn}
      >
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.common.loading}
        </p>
      </GameShell>
    )
  }

  if (status === 'failed') {
    return (
      <GameShell
        gameId={GAME_ID}
        heading={es.paraulogic.heading}
        intro={es.paraulogic.intro}
        signedIn={signedIn}
      >
        <ErrorMessage
          title={es.errors.title}
          retryLabel={es.common.retry}
          onRetry={() => {
            setErrorMessage('')
            load().catch((error) => setErrorMessage(error.message))
          }}
        >
          {errorMessage}
        </ErrorMessage>
      </GameShell>
    )
  }

  return (
    <GameShell
      gameId={GAME_ID}
      heading={es.paraulogic.heading}
      intro={es.paraulogic.intro}
      score={score}
      signedIn={signedIn}
    >
      {/*
        Las letras van una a una en una lista. Cada letra es un `<li>`: quien usa
        un lector de pantalla puede contarlas, y una fila de cajas sueltas no se
        anuncia con ninguna estructura.
      */}
      <section aria-labelledby="letters-heading" className="ui-card">
        <h2 id="letters-heading" className="text-xl font-bold">
          {es.paraulogic.lettersHeading}
        </h2>

        <p className="mt-2 text-lg text-ink-muted">{es.paraulogic.lettersHelp}</p>

        <ul className="ui-letter-row list-none" aria-label={es.paraulogic.lettersHeading}>
          {letters.split('').map((letter, index) => (
            <li key={`${letter}-${index}`} className="ui-letter-tile">
              {letter}
            </li>
          ))}
        </ul>
      </section>

      {/* El progreso. Se dice en palabras, no solo con el número (§4.2). */}
      <section aria-labelledby="progress-heading" className="ui-card">
        <h2 id="progress-heading" className="text-xl font-bold">
          {format(es.paraulogic.foundHeading, { count: found.length })}
        </h2>

        {/*
          Al volver a una partida empezada se dice. Nunca aparece como si fuera la
          primera vez sin avisar (§2.1.7): alguien que ya encontró 8 palabras y
          ve «todavía no has encontrado ninguna» pensaría que se le ha perdido
          el progreso.
        */}
        {found.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-3" aria-label={es.paraulogic.foundHeading}>
            {found.map((word) => (
              <li key={word} className="ui-found-word">
                {word}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-lg font-semibold" aria-live="polite">
          {pending === 0 ? es.paraulogic.allFound : format(es.paraulogic.pending, { count: pending })}
        </p>
      </section>

      <section className="ui-card">
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <TextField
            label={es.paraulogic.writeLabel}
            hint={es.paraulogic.intro}
            name="word"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              setFeedback(null)
            }}
            placeholder={es.paraulogic.writePlaceholder}
            disabled={checking || pending === 0}
            inputRef={undefined}
          />

          {feedback !== null && feedback.kind === 'correct' && (
            <p role="status" className="text-lg font-semibold text-success">
              {format(es.paraulogic.correct, { word: feedback.word })}
            </p>
          )}

          {feedback !== null && feedback.kind === 'incorrect' && (
            <p role="status" className="text-lg font-semibold">
              {es.paraulogic.incorrect}
            </p>
          )}

          {errorMessage !== '' && <ErrorMessage>{errorMessage}</ErrorMessage>}

          <div className="flex flex-wrap gap-4">
            <Button type="submit" disabled={checking || pending === 0 || draft.trim() === ''}>
              {checking ? es.paraulogic.checking : es.paraulogic.submit}
            </Button>
          </div>
        </form>

        {/*
          La pista va **debajo** del formulario y no en un sitio aparte, porque es
          una ayuda para escribir una palabra. Y el aviso de que no resta puntos
          está pegado al botón: si estuviera arriba, quien está mirando el teclado
          no lo vería antes de decidir.
        */}
        <div className="mt-6 border-t border-border-soft pt-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={askHint} disabled={askingHint || pending === 0}>
              {askingHint ? es.paraulogic.hintLoading : es.paraulogic.hintButton}
            </Button>

            <span className="text-lg text-ink-muted">{es.paraulogic.hintButtonHint}</span>
          </div>

          {hint !== null && (
            <div role="status" className="mt-4 text-lg">
              <p className="font-semibold">{hint.hintText}</p>
              <p>
                {format(es.paraulogic.hintLength, { count: hint.wordLength })}
                {' · '}
                {hint.isCommon ? es.paraulogic.hintCommon : es.paraulogic.hintHard}
              </p>
            </div>
          )}
        </div>
      </section>
    </GameShell>
  )
}

export default ParaulogicPage