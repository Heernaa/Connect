import { es } from './i18n/es.js'

/**
 * Mapa de rutas: el único sitio donde se decide qué se pinta en cada pantalla.
 *
 * **La clave es la ruta.** `resolveRoute` busca por el hash limpio, así que una
 * clave distinta del `path` haría que esa pantalla no existiera y todo caería en
 * la portada sin explicar por qué (§2.1.6). Por eso las de los juegos repiten
 * `game/` en la clave y en el `path`: es incómodo y es deliberado, y
 * `routes.test.js` falla si algún día dejan de coincidir.
 *
 * Cada entrada lleva el título del documento. No es adorno: es lo que lee el
 * lector de pantalla al cambiar de pestaña, y lo que anuncia el mensaje de
 * «página cambiada» (R-005). El título viene del diccionario (§4.2), porque es
 * una cadena visible.
 *
 * **Las rutas van en inglés y los rótulos en español, a propósito.** La
 * constitución (§3.1) pide identificadores en inglés, y una ruta es un
 * identificador, no texto: quien la ve en la barra de direcciones está leyendo
 * código. El rótulo que aparece en pantalla sale del diccionario. Además, así el
 * test que comprueba que no hay texto de interfaz en los componentes (§4.2)
 * puede distinguir «una etiqueta escrita a mano» de «un nombre de ruta» sin
 * tener que hacer excepciones.
 */
export const ROUTES = {
  '': {
    path: '',
    title: `${es.home.heading} — ${es.app.name}`,
    kind: 'home',
  },
  games: {
    path: 'games',
    title: `${es.nav.games} — ${es.app.name}`,
    kind: 'games',
  },
  register: {
    path: 'register',
    title: `${es.nav.register} — ${es.app.name}`,
    kind: 'register',
  },
  login: {
    path: 'login',
    title: `${es.nav.login} — ${es.app.name}`,
    kind: 'login',
  },
  leaderboard: {
    path: 'leaderboard',
    title: `${es.nav.leaderboard} — ${es.app.name}`,
    kind: 'leaderboard',
  },
  chat: {
    path: 'chat',
    title: `${es.nav.chat} — ${es.app.name}`,
    kind: 'chat',
  },

  // Los tres juegos (spec 006 · R-014). El sufijo es el `game_id` de la API, no
  // el nombre del juego: `game_id` es un identificador estable y `name` es un
  // texto que puede cambiar —«Paraulógic» se renombra sin que pase a ser otro
  // juego—. Los títulos salen del diccionario, no del nombre del juego (§3.1).
  'game/paraulogic': {
    path: 'game/paraulogic',
    title: `${es.paraulogic.heading} — ${es.app.name}`,
    kind: 'game',
    gameId: 'paraulogic',
  },
  'game/wordle': {
    path: 'game/wordle',
    title: `${es.wordle.heading} — ${es.app.name}`,
    kind: 'game',
    gameId: 'wordle',
  },
  'game/riddle': {
    path: 'game/riddle',
    title: `${es.riddle.heading} — ${es.app.name}`,
    kind: 'game',
    gameId: 'riddle',
  },
}

/** Ruta que se abre cuando no hay hash, o cuando el hash no existe. */
export const DEFAULT_ROUTE = ''

/**
 * Enlace interno de navegación.
 *
 * Un `<a href="#/...">` de verdad y no un `<div>` con `onClick`: el enlace se
 * puede abrir en otra pestaña, se puede copiar, los lectores de pantalla lo
 * anuncian como enlace y el hash se puede comprobar en una prueba (R-005).
 */
export function routeHref(path) {
  return `#/${path}`
}
