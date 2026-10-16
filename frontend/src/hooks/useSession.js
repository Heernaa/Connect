import { useCallback, useEffect, useMemo, useState } from 'react'

import { fetchCurrentUser, signOutAccount } from '../lib/api.js'

/**
 * Sesión de la persona que está usando la aplicación (spec 003 · R-006).
 *
 * La sesión vive en una cookie `HttpOnly`: el frontend nunca ve el token. Por eso
 * "quién está dentro" no se puede leer del navegador, hay que preguntárselo al
 * servidor al arrancar, y por eso hay un instante en que no se sabe todavía.
 *
 * Se distingue ese instante del "no hay nadie dentro", porque son cosas
 * distintas: uno es «todavía no lo sé» y el otro es «sé que no hay nadie». La
 * portada y la lista de juegos se ven igual en ambos casos (§2.4, modo
 * espectador), así que mientras se comprueba no se enseña nada raro.
 */
export function useSession() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    fetchCurrentUser({ signal: controller.signal })
      .then((currentUser) => {
        if (controller.signal.aborted) return

        setUser(currentUser)
      })
      .catch(() => {
        // Un fallo al comprobar la sesión no puede dejar la aplicación en
        // blanco. Se sigue como espectador, que es un estado que funciona
        // (R-013: mensaje claro, no pantalla rota).
        if (!controller.signal.aborted) setUser(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false)
      })

    return () => controller.abort()
  }, [])

  const signOut = useCallback(async () => {
    setSigningOut(true)

    try {
      await signOutAccount()
      setUser(null)
    } catch {
      // Si el servidor no confirma, no se finge que se ha cerrado la sesión:
      // se conserva el estado y quien queda dentro es quien estaba. El botón
      // vuelve a su etiqueta para que se pueda reintentar.
    } finally {
      setSigningOut(false)
    }
  }, [])

  return useMemo(
    () => ({ user, checking, signingOut, signOut, setUser }),
    [user, checking, signingOut, signOut],
  )
}
