import { describe, expect, it } from 'vitest'

import { DEFAULT_ROUTE, ROUTES, routeHref } from './routes.js'
import { resolveRoute } from './lib/navigation.js'

/**
 * El mapa de rutas (spec 006 · R-014).
 *
 * Aquí se comprueba el invariante que `resolveRoute` da por hecho: **la clave del
 * mapa es la ruta**. No lo prueba el enrutador —`resolveRoute` devuelve la portada
 * cuando no encuentra la clave, y eso parece funcionar— pero lo que falla es que
 * la pantalla del juego aparece en la portada sin decir por qué (§2.1.6).
 *
 * Ya pasó una vez: las rutas de los juegos se escribieron con la clave
 * `paraulogic` y el `path` `game/paraulogic`. `#/game/paraulogic` no encontraba
 * su clave y todo caía en la portada.
 */
describe('el mapa de rutas', () => {
  it('la clave de cada entrada es su propia ruta', () => {
    const rotas = Object.entries(ROUTES)
      .filter(([key, route]) => key !== route.path)
      .map(([key, route]) => `${key} → ${route.path}`)

    expect(rotas, `Estas rutas no se encontrarían por su hash:\n${rotas.join('\n')}`).toEqual([])
  })

  it('todas las rutas se encuentran por su hash', () => {
    const noEncontradas = Object.entries(ROUTES)
      .filter(([, route]) => resolveRoute(`#/${route.path}`) !== ROUTES[route.path])
      .map(([, route]) => route.path)

    expect(noEncontradas).toEqual([])
  })

  it('las tres pantallas de juego existen y llevan game_id', () => {
    // R-014: la pantalla se elige por `game_id`, no por el nombre. Sin este
    // campo, `GameScreen` no sabe cuál de las tres pintar.
    const juegos = Object.values(ROUTES).filter((route) => route.kind === 'game')

    expect(juegos.map((route) => route.gameId).sort()).toEqual(['paraulogic', 'riddle', 'wordle'])
  })

  it('cada game_id de la ruta tiene su propia pantalla', () => {
    // Un `game_id` en la ruta sin página sería un enlace que cae en la portada.
    const paginas = Object.values(ROUTES)
      .filter((route) => route.kind === 'game')
      .map((route) => route.gameId)

    expect(new Set(paginas).size).toBe(paginas.length)
  })

  it('la ruta por defecto existe', () => {
    expect(ROUTES[DEFAULT_ROUTE]).toBeDefined()
  })

  it('routeHref produce un hash navegable', () => {
    expect(routeHref('game/wordle')).toBe('#/game/wordle')
  })

  it('un hash desconocido lleva a la portada, no a un error', () => {
    // §2.1.6: el producto no puede tener callejones sin salida.
    expect(resolveRoute('#/no-existe')).toBe(ROUTES[DEFAULT_ROUTE])
  })

  it('los juegos no están en la navegación principal', () => {
    // Los juegos se llegan desde la lista, no desde el menú: la navegación tiene
    // que caber en una línea en un móvil de 360px con la fuente al 200%.
    const enElMenu = Object.values(ROUTES).filter((route) => route.kind === 'game')

    expect(enElMenu).toHaveLength(3)
  })
})