import { createContext, useContext } from 'react'

import { ROUTES, DEFAULT_ROUTE } from '../routes.js'

/**
 * Contexto del enrutador (R-011).
 *
 * Vive aparte de `<Router>` a propósito: un archivo que exporta el componente y
 * además funciones utilidades no permite que el refresco en caliente de Vite
 * funcione (regla `only-export-components`), y en desarrollo eso significa que
 * cada guardado recarga la página entera y se pierde el estado de lo que se
 * estaba viendo.
 */

/** Normaliza un hash a una ruta conocida. */
const RouterContext = createContext(null)

/**
 * Normaliza un hash a una ruta.
 *
 * `@games` y `#games/` son la misma página que `#/games`: quien comparta el
 * enlace escribiendo el hash a mano no debe caer en un error de «página no
 * encontrada».
 *
 * Un hash que no existe lleva a la portada en lugar de a un error. Es una
 * decisión de producto (§2.1.6): el sitio no puede tener callejones sin salida, y
 * quien llega a un enlace mal escrito debe acabar en un sitio donde puede volver
 * a empezar.
 */
export function resolveRoute(hash) {
  const clean = (hash || '')
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .toLowerCase()

  return ROUTES[clean] ?? ROUTES[DEFAULT_ROUTE]
}

/** Devuelve `{ route, navigate }`. Lanza si se usa fuera del enrutador. */
export function useRouter() {
  const context = useContext(RouterContext)

  if (context === null) {
    throw new Error('useRouter se ha usado fuera de <Router>.')
  }

  return context
}

export { RouterContext }
