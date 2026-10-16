import { ParaulogicPage } from './ParaulogicPage.jsx'
import { RiddlePage } from './RiddlePage.jsx'
import { WordlePage } from './WordlePage.jsx'

/**
 * Qué pantalla de juego corresponde a cada `game_id` (spec 006 · R-014).
 *
 * Existe para no meter el `switch` dentro de `App.jsx`, y para que añadir un
 * cuarto juego sea **una línea en este mapa y una ruta en `routes.js`**. §2.1.1
 * pide que añadir un cuarto juego no obligue a tocar lo que ya funciona.
 *
 * **La clave es el `game_id` de la API, no el nombre del juego.** El nombre es un
 * texto que puede cambiar —«Paraulógic» se puede renombrar sin que pase a ser
 * otro juego— y una pantalla que dependa de él se rompería el día del cambio
 * (§3.1). Es el mismo motivo por el que las rutas son `game/paraulogic` y no
 * `game/Paraulógic`.
 *
 * Un `game_id` que no esté aquí devuelve `null` y la pantalla no pinta nada: el
 * enrutador ya manda a la portada cualquier hash que no conozca (§2.1.6), así que
 * llegar aquí con un `gameId` desconocido sería un dato corrupto, y lo
 *correcto con un dato corrupto es no pintar nada (R-013).
 */
export function GameScreen({ gameId, signedIn }) {
  const Page =
    gameId === 'paraulogic'
      ? ParaulogicPage
      : gameId === 'wordle'
        ? WordlePage
        : gameId === 'riddle'
          ? RiddlePage
          : null

  if (Page === null) return null

  return <Page signedIn={signedIn} />
}

export default GameScreen