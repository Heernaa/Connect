import { useCallback, useEffect, useState } from 'react'

import { Button } from '../components/ui/Button.jsx'
import { ErrorMessage } from '../components/ui/ErrorMessage.jsx'
import { GameShell } from '../components/GameShell.jsx'
import { TextField } from '../components/ui/TextField.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'
import { formatPoints } from '../i18n/socialFormat.js'
import { fetchRiddleContent, fetchRiddleSession, reportRiddleAnswer, submitRiddleAnswer } from '../lib/api.js'

const GAME_ID = 'riddle'

/**
 * Acertijo (spec 006 · R-014, R-016, R-017).
 *
 * El acertijo es el más sencillo de los tres y el que más puede fallar sin que
 * se note: si alguien falla y no se le dice que **no pasa nada**, deja de
 * intentar. Por eso el aviso de que fallar no resta puntos está **antes** del
 * campo, no en el mensaje de error de después (§2.1.5).
 *
 * Y de ahí sale el reporte (§2.1.4): la comparación se hace normalizando
 * mayúsculas, tildes, puntuación y espacios. Eso hace el juego usable, pero
 * siempre deja algún caso: un plural que no estaba, una palabra con dos
 * maneras de escribirse. Quien acertó y oye «no es correcta» se queda con la
 * impresión de que la plataforma está rota. El botón de reportar es para eso.
 *
 * El botón de reportar **solo aparece tras un rechazo**, nunca antes. Un botón
 * de «reportar» siempre visible invita a usarlo sin motivo, y el reporte no
 * concede puntos: no es una forma de(score).
 */
export function RiddlePage({ signedIn }) {
  const [question, setQuestion] = useState('')
  const [solved, setSolved] = useState(false)
  const [attemptsUsed, setAttemptsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')

  const [draft, setDraft] = useState('')
  const [checking, setChecking] = useState(false)
  const [lastAnswerWrong, setLastAnswerWrong] = useState(false)
  const [justSolved, setJustSolved] = useState(false)

  /**
   * Lo último que se escribió y fue rechazado.
   *
   * Va aparte del campo porque al fallar el campo se vacía, para no dejar escrito
   * lo que no era. El botón de reportar manda esto: quien lo pulsa quiere decir
   * «esto es lo que puse y me lo habéis rechazado».
   */
  const [lastAnswer, setLastAnswer] = useState('')

  const [reporting, setReporting] = useState(false)
  const [reportDone, setReportDone] = useState('')
  const [reportError, setReportError] = useState('')

  const load = useCallback(async () => {
    const [content, session] = await Promise.all([fetchRiddleContent(), fetchRiddleSession()])

    setQuestion(content.question)
    setSolved(session.solved)
    setAttemptsUsed(session.attemptsUsed)
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

    const answer = draft.trim()

    if (answer === '') return

    setChecking(true)
    setErrorMessage('')
    setJustSolved(false)
    setReportError('')

    try {
      const result = await submitRiddleAnswer({ answer })

      setAttemptsUsed(result.attemptsUsed)
      setDraft('')

      if (result.isCorrect) {
        // Los puntos **no se escriben aquí**. La respuesta del servidor al
        // comprobar no los trae, y poner «10» en el cliente sería el número
        // duplicado en dos sitios: el día que la puntuación cambie, la pantalla
        // mentirá (R-013, §6.6). Se recarga la partida y el servidor lo dice.
        await load()

        setJustSolved(true)
        // Al acertar, el botón de reportar desaparece: ya no hay nada que
        // reportar, y dejarlo sería ofrecer una opción que no aplica.
        setLastAnswerWrong(false)
        setReportDone('')
      } else {
        setLastAnswerWrong(true)
        setLastAnswer(answer)
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setChecking(false)
    }
  }

  const sendReport = async () => {
    setReporting(true)
    setReportError('')

    try {
      const result = await reportRiddleAnswer({ givenAnswer: lastAnswer })

      // Se enseña el mensaje **del servidor**, que ya dice que no da puntos. La
      // interfaz no lo reescribe: un texto que se dice en dos sitios acaba
      // siendo el que nadie revisa (§4.2).
      setReportDone(result.message)
    } catch (error) {
      setReportError(error.message)
    } finally {
      setReporting(false)
    }
  }

  useEffect(() => {
    if (lastAnswerWrong && draft.trim() !== '') setLastAnswer(draft.trim())
  }, [lastAnswerWrong, draft])

  if (status === 'loading') {
    return (
      <GameShell gameId={GAME_ID} heading={es.riddle.heading} intro={es.riddle.intro} signedIn={signedIn}>
        <p className="text-lg text-ink-muted" aria-live="polite">
          {es.common.loading}
        </p>
      </GameShell>
    )
  }

  if (status === 'failed') {
    return (
      <GameShell gameId={GAME_ID} heading={es.riddle.heading} intro={es.riddle.intro} signedIn={signedIn}>
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
      heading={es.riddle.heading}
      intro={es.riddle.intro}
      score={score}
      signedIn={signedIn}
    >
      <section aria-labelledby="question-heading" className="ui-card">
        <h2 id="question-heading" className="text-xl font-bold">
          {es.riddle.questionHeading}
        </h2>

        {/* El enunciado es contenido del juego: lo sirve la API (§2.1.2). */}
        <p className="mt-4 text-xl">{question}</p>
      </section>

      {justSolved && (
        <p role="status" className="ui-card text-lg font-semibold text-success">
          {format(es.riddle.correct, { points: formatPoints(score) })}
        </p>
      )}

      {/*
        Al volver a una partida ya acertada se dice que lo está, pero **no** se
        escribe la respuesta: el servidor no la devuelve nunca (§2.1.2) y
        adivinarla en el cliente sería inventar el contenido del juego.
      */}
      {solved && !justSolved && (
        <p className="ui-card text-lg font-semibold">{es.riddle.solvedHeading}</p>
      )}

      {!solved && (
        <section className="ui-card">
          <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
            {/*
              El aviso de que fallar no resta nada va **antes** del campo. Si
              estuviera después, en el mensaje de error, llegaría demasiado tarde:
              la decisión de volver a intentarlo ya está tomada.
            */}
            <p className="text-lg text-ink-muted">{es.riddle.noPenalty}</p>

            <TextField
              label={es.riddle.answerLabel}
              name="answer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={es.riddle.answerPlaceholder}
              disabled={checking}
            />

            {lastAnswerWrong && <p role="status" className="text-lg font-semibold">{es.riddle.incorrect}</p>}

            {errorMessage !== '' && <ErrorMessage>{errorMessage}</ErrorMessage>}

            <div className="flex flex-wrap gap-4">
              <Button type="submit" disabled={checking || draft.trim() === ''}>
                {checking ? es.riddle.checking : es.riddle.submit}
              </Button>
            </div>
          </form>

          <p className="mt-4 text-lg text-ink-muted" aria-live="polite">
            {format(es.riddle.attemptsHeading, { count: attemptsUsed })}
          </p>

          {/*
            El reporte aparece **solo tras un rechazo**. Antes de eso no hay nada
            que reportar, y un botón de «reportar» siempre visible sería una
            invitación a usarlo sin motivo (§4.1).
          */}
          {lastAnswerWrong && reportDone === '' && (
            <div className="mt-6 border-t border-border-soft pt-4">
              <p className="text-lg">{es.report.noPointsWarning}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={sendReport} disabled={reporting}>
                  {reporting ? es.report.sending : es.report.button}
                </Button>
              </div>

              {reportError !== '' && (
                <div className="mt-3">
                  <ErrorMessage>{reportError}</ErrorMessage>
                </div>
              )}
            </div>
          )}

          {reportDone !== '' && (
            <div role="status" className="mt-6 border-t border-border-soft pt-4">
              <p className="text-lg font-semibold">{reportDone}</p>
              <p className="text-lg text-ink-muted">{es.report.undoHint}</p>
            </div>
          )}
        </section>
      )}
    </GameShell>
  )
}

export default RiddlePage