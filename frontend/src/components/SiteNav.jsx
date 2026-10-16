import { es } from '../i18n/es.js'
import { routeHref } from '../routes.js'

/**
 * Navegación principal (R-005, R-006, R-011).
 *
 * · Es una `<nav>` con etiqueta, porque hay más zonas navegables en la página
 *   que un lector de pantalla pueda saltar entre ellas (R-006).
 * · Los enlaces son enlaces: `href` real a `#/ruta`, para que se puedan abrir en
 *   otra pestaña, copiar y usar con los botones atrás y adelante (R-005).
 * · `aria-current="page"` en la ruta activa. Es lo que anuncia «página actual»;
 *   el fondo blanco solo lo refuerza, porque el color nunca es el único canal
 *   (R-004).
 * · Separación de 24px, más generosa que los 16px habituales. Con la fuente al
 *   200% son 48px reales, y es entonces cuando dos enlaces contiguos se
 *   confunden (R-002).
 *
 * Va **dentro** de la banda cian, no debajo: en Figma la cabecera y el menú son
 * la misma cosa, y una sola barra se lee mejor que dos que compiten.
 */
const LINKS = [
  { path: '', key: 'home' },
  { path: 'games', key: 'games' },
  { path: 'leaderboard', key: 'leaderboard' },
]

export function SiteNav({ currentKind }) {
  return (
    <nav aria-label={es.nav.mainNavigation}>
      {/* El `ul` existe por estructura de lista: una barra de enlaces es una
          lista, y quien usa un lector de pantalla puede contarla y saltarla. */}
      <ul className="flex flex-wrap items-center gap-3 sm:gap-6">
        {LINKS.map((link) => (
          <li key={link.key}>
            <a
              className="ui-navlink"
              href={routeHref(link.path)}
              aria-current={currentKind === link.key ? 'page' : undefined}
            >
              {es.nav[link.key]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default SiteNav
