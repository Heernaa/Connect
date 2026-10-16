import { useCallback, useEffect, useMemo, useState } from 'react'

import { RouterContext, resolveRoute } from './lib/navigation.js'

/**
 * Enrutador por hash, mínimo y propio (R-011, R-005).
 *
 * Por qué no `react-router-dom`: son cuatro pantallas y no hace falta una
 * librería para ellas (§1.3, simple antes que sofisticado). Con rutas anidadas,
 * parámetros y protección de rutas, esa dependencia costaría más de lo que
 * aporta, y §6.7 obliga a justificar cada dependencia nueva. Cuando aparezca
 * una necesidad que no se pueda cubrir aquí, se añade la librería y se borra
 * este archivo. No antes.
 *
 * `useRouter`, `resolveRoute` y el contexto están en `lib/navigation.js`: este
 * archivo solo exporta el componente, para que el refresco en caliente de Vite
 * siga funcionando en desarrollo.
 *
 * Qué resuelve bien, porque son cosas que se olvidan y rompen la accesibilidad:
 *
 * · Al cambiar de vista, el foco se lleva a `main` y el título se anuncia. Sin
 *   esto, quien navega con lector de pantalla oye el título nuevo sin saber
 *   dónde está (R-005). Lo hace `App`, no este componente.
 * · `href` real en cada enlace (`#/games`), no `<div onClick>`. Con `href` el
 *   enlace se puede abrir en otra pestaña, copiar y compartir, y los lectores de
 *   pantalla lo anuncian como enlace (R-005).
 * · Se apoya en `hashchange`, que es lo que hace que los botones atrás y
 *   adelante del teclado funcionen sin `history.pushState`.
 */
export function Router({ children }) {
  const [route, setRoute] = useState(() => resolveRoute(window.location.hash))

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(resolveRoute(window.location.hash))
    }

    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const navigate = useCallback((path) => {
    const next = `#/${String(path).replace(/^\/+/, '')}`

    // Misma ruta: no se dispara `hashchange`, así que no hay nada que
    // actualizar. Se deja estar en lugar de forzar un repintado inútil.
    if (window.location.hash === next) return

    window.location.hash = next
  }, [])

  const value = useMemo(() => ({ route, navigate }), [route, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export default Router
