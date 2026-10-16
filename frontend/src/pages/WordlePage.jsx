import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { GameShell } from '../components/GameShell.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { submitWordleAttempt, fetchWordleContent, fetchWordleSession } from '../lib/api.js'

const GAME_ID = 'wordle'

const WORD_LENGTH = 5
const MAX_ATTEMPTS = 6
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Los tres estados de una letra, con su glifo y su texto (R-004, §2.1.4).
 *
 * El glifo va **dentro** de la casilla y es visible. Es lo que permite distinguir
 * los tres estados sin depender del color, que es el requisito que §2.1.4 pide
 * explícitamente y el que un filtro de daltonismo rompería sin más.
 *
 * El texto largo va en `sr-only`: quien usa lector de pantalla oye «está en su
 * sitio» en vez de «✓». Y los tres estados están escritos arriba, en la leyenda,
 * para que los glifos se aprendan una vez y no se tengan que adivinar.
 */
const FEEDBACK = {
  correct: { glyph: '✓', label: 'feedbackCorrect' },
  present: { glyph: '◐', label: 'feedbackPresent' },
  absent: { glyph: '✗', label: 'feedbackAbsent' },
}

/**
 * Wordle (spec 006 · R-014, R-016).
 *
 * Lo que hace distinto de los otros dos juegos:
 *
 * · **Se juega una sola vez** (§2.1.4). Al volver no se enseña el juego sino el
 *   resultado. Por eso `already_finished` decide entre dos pantallas
 *   completamente distintas, y por eso el aviso de «salir» es el único que lleva
 *   advertencia: es la única acción del proyecto que no se puede deshacer.
 * · **Cada letra tiene tres estados** y hay que verlos sin color (§2.1.4).
 * · **Hay un teclado en pantalla.** No es adorno: es lo que permite escribir sin
 *   precisión motora fina (§1.1). Un `<input>` con teclado físico sigue siendo
 *   la vía más rápida para quien teclee bien, así que **los dos** están: el
 *   campo para escribir y el teclado para pulsar. El teclado no sustituye al
 *   campo, y el campo no obliga a usar el teclado.
 */
export function WordlePage({ signedIn }) {
  const [attempts, setAttempts] = useState([])
  const [score, setScore] = useState(0)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [solved, setSolved] = useState(false)
  const [finished, setFinished] = useState(false)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const [draft, setDraft] = useState('')
  const [checking, setChecking] = useState(false)
  const guessRef = useRef(null)
  const [feedback, setFeedback] = useState('')

  /**
   * Restaurar la partida (R-014, §2.1.7).
   *
   * Los intentos guardados vienen **con su pista de tres letras**, calculada por
   * el servidor en su día. No se recalculan aquí: para eso habría que tener la
   * palabra secreta, que es justo lo que el servidor no enseña (§2.1.2).
   */
  const load = useCallback(async () => {
    // **En este orden y no en paralelo.** La palabra objetivo solo se sirve si hay
    // una partida en marcha (R-004 de la spec 004), y la partida la crea la
    // consulta de sesión. Pidiendo las dos a la vez, la del contenido puede llegar
    // primero, no encontrar partida todavía y responder «ya has terminado»: la
    // pantalla abría con «Esta vez no la has acertado» y sin formulario, en la
    // primera partida de una cuenta recién creada.
    //
    // Son dos idas y vuelta a un servidor local; la corrección vale más que el
    // milisegundo que se ahorra.
    const session = await fetchWordleSession()
    const content = await fetchWordleContent()

    setAttempts(session.attempts)
    setAttemptsUsed(session.attemptsUsed)
    setScore(session.score)
    setFinished(content.alreadyFinished || session.status !== 'active')

    // `solved` se deduce de los intentos guardados: si alguno lo consiguió, ya
    // está acertado. Es lo mismo que hace el servidor al restaurar, y evita que
    // al recargar aparezca como si aún no se hubiera ganado.
    setSolved(session.attempts.some((attempt) => attempt.solved))
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

  const normalized = draft.trim().toUpperCase()

  const submit = async (event) => {
    event.preventDefault()

    if (normalized.length !== WORD_LENGTH) return

    setChecking(true)
    setFeedback('')
    setErrorMessage('')

    try {
      const result = await submitWordleAttempt({ guess: normalized })

      setAttempts((current) => [...current, result])
      setAttemptsUsed(result.attemptNumber)
      setDraft('')

      if (result.score > 0) setScore(result.score)

      if (result.solved) {
        setSolved(true)
        setFinished(true)
      } else if (result.attemptNumber >= MAX_ATTEMPTS) {
        setFinished(true)
      }
    } catch (error) {
      // El 409 de «ya has jugado» llega aquí. Se trata como lo que es: la
      // partida se acabó, no un fallo de la red (R-009).
      setFinished(true)
      setErrorMessage(error.message)
    } finally {
      setChecking(false)
    }
  }

  const pressLetter = (letter) => {
    if (normalized.length >= WORD_LENGTH) return

    setDraft((current) => `${current}${letter}`)
  }

  const pressBackspace = () => {
    setDraft((current) => current.slice(0, -1))
  }

  const attemptsLeft = MAX_ATTEMPTS - attemptsUsed

  return (
    <GameShell
      gameId={GAME_ID}
      heading={es.wordle.heading}
      intro={es.wordle.intro}
      score={score}
      signedIn={signedIn}
      wordleNeedsWarning={!finished}
      onLeft={() => {
        // Al salir se recarga el estado real. Sin esto seguiría viendo el teclado
        // de una partida que ya no existe, y prometería algo que no se puede
        // hacer (§4.2).
        setFinished(true)
      }}
    >
      {status === 'loading' && (
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.common.loading}
        </p>
      )}

      {status === 'failed' && (
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
      )}

      {status === 'ready' && (
        <>
          {/*
            La leyenda va **antes** de la rejilla. Los tres estados tienen glifo,
            y un glifo sin explicación obliga a adivinarlo una vez por casilla. Se
            escribe una vez y ya se sabe para el resto de la partida.
          */}
          <section aria-labelledby="legend-heading" className="ui-card">
            <h2 id="legend-heading" className="sr-only">
              {es.wordle.letters}
            </h2>

            <ul className="ui-legend">
              {Object.entries(FEEDBACK).map(([key, { glyph, label }]) => (
                <li key={key} className="ui-legend__item" data-state={key}>
                  <span className="ui-legend__glyph" aria-hidden="true">
                    {glyph}
                  </span>
                  <span>{es.wordle[label]}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="grid-heading" className="ui-card">
            <h2 id="grid-heading" className="text-xl font-bold">
              {es.wordle.gridHeading}
            </h2>

            <p className="mt-2 text-lg" aria-live="polite">
              {format(es.wordle.attemptsHeading, { used: attemptsUsed, max: MAX_ATTEMPTS })}
            </p>

            {attempts.length === 0 ? (
              <p className="mt-4 text-lg text-ink-muted">{es.wordle.writeHint}</p>
            ) : (
              <ol className="ui-attempts">
                {attempts.map((attempt) => (
                  <li key={attempt.attemptNumber} className="ui-attempt">
                    <span className="sr-only">
                      {format(es.wordle.attemptsHeading, {
                        used: attempt.attemptNumber,
                        max: MAX_ATTEMPTS,
                      })}
                    </span>

                    <ol className="ui-wordle-row">
                      {attempt.guess.split('').map((letter, index) => {
                        const state = attempt.feedback[index] ?? 'absent'

                        return (
                          <li key={`${letter}-${index}`} className="ui-wordle-cell" data-state={state}>
                            <span className="ui-wordle-cell__letter" aria-hidden="true">
                              {letter}
                            </span>

                            {/*
                              El glifo dentro de la casilla es la señal visible; este
                              texto es lo que oye quien usa lector de pantalla. Los
                              dos cuentan: quitar cualquiera de los dos rompe a
                              medio grupo de usuarios (R-004).
                            */}
                            <span className="ui-wordle-cell__glyph" aria-hidden="true">
                              {FEEDBACK[state].glyph}
                            </span>
                            <span className="sr-only">{es.wordle[FEEDBACK[state].label]}</span>
                          </li>
                        )
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {finished ? (
            <WordleResult solved={solved} attemptsUsed={attemptsUsed} />
          ) : (
            <section className="ui-card">
              <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
                <TextField
                  label={es.wordle.writeLabel}
                  name="guess"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value)
                    setFeedback('')
                  }}
                  placeholder={es.wordle.writePlaceholder}
                  disabled={checking}
                  inputRef={guessRef}
                />

                {feedback !== '' && <ErrorMessage>{feedback}</ErrorMessage>}

                <p className="text-lg text-ink-muted" aria-live="polite">
                  {format(es.wordle.attemptsLeft, { count: attemptsLeft })}
                </p>

                {errorMessage !== '' && <ErrorMessage>{errorMessage}</ErrorMessage>}

                <div className="flex flex-wrap gap-4">
                  <Button
                    type="submit"
                    disabled={checking || normalized.length !== WORD_LENGTH}
                  >
                    {checking ? es.wordle.checking : es.wordle.submit}
                  </Button>
                </div>
              </form>

              {/*
                El teclado en pantalla. Cada tecla es un `<button>` real, con 44px
                de alto por el token del sistema, y con su nombre accesible. Es
                además lo que permite jugar sin precisión motora fina (§1.1): un
                teclado táctil de 12px sería inusable con temblor en las manos.
              */}
              <div className="mt-6 border-t border-border-soft pt-4">
                <h3 className="text-lg font-bold">{es.wordle.keyboardHeading}</h3>

                <div className="ui-keyboard" role="group" aria-label={es.wordle.keyboardHeading}>
                  {ALPHABET.split('').map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      className="ui-key"
                      onClick={() => pressLetter(letter)}
                      disabled={checking || normalized.length >= WORD_LENGTH}
                      aria-label={format(es.wordle.keyboardKey, { letter })}
                    >
                      {letter}
                    </button>
                  ))}

                  <button
                    type="button"
                    className="ui-key ui-key--wide"
                    onClick={pressBackspace}
                    disabled={checking || draft.length === 0}
                    aria-label={es.wordle.keyboardBackspace}
                  >
                    ⌫
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </GameShell>
  )
}

/** El resultado, cuando la partida ya no se puede jugar (R-016). */
function WordleResult({ solved, attemptsUsed }) {
  return (
    <section aria-labelledby="result-heading" className="ui-card">
      <h2 id="result-heading" className="text-xl font-bold">
        {es.wordle.resultHeading}
      </h2>

      <p className="mt-3 text-lg font-semibold">
        {solved
          ? format(es.wordle.resultSolvedIn, { number: attemptsUsed })
          : es.wordle.resultNotSolved}
      </p>
    </section>
  )
}

export default WordlePage