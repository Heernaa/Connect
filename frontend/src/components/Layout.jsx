import { FontSizeControl } from './FontSizeControl.jsx'
import { RouteAnnouncer } from './RouteAnnouncer.jsx'
import { SiteNav } from './SiteNav.jsx'
import { es } from '../i18n/es.js'
import { format } from '../i18n/format.js'

/**
 * Esqueleto común a todas las pantallas (R-011).
 *
 * La misma estructura en las cuatro páginas: enlace de salto, banda de
 * cabecera con el nombre y el control de tamaño, navegación, `main` con el
 * contenido, pie. Que sea idéntica en todas es lo que hace que la segunda
 * pantalla se sienta conocida: quien aprende la portada ya sabe dónde está el
 * menú en las otras tres.
 *
 * **La cabecera y la navegación son la misma banda.** En Figma no hay dos
 * barras: hay un bloque cian con el nombre a un lado y las páginas al otro. Se
 * mantiene así porque una sola banda con un solo color es más fácil de leer que
 * dos barras que compiten por la atención.
 *
 * El orden en el DOM es también el orden del foco y el orden de lectura, porque
 * no hay `order`, ni `grid-area`, ni `flex-direction: row-reverse` que los
 * separen. En una interfaz para mayores, un orden de tabulación que no coincide
 * con lo que se ve es una forma de perder a la persona sin avisar (R-005).
 */
export function Layout({ route, children, session, mainRef }) {
  return (
    <>
      {/*
        El enlace de salto va lo primero de todo, también en el DOM: si está al
        final, hay que recorrer la cabecera entera en cada página para llegar al
        contenido (R-005).
      */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-lg focus:font-semibold"
      >
        {es.accessibility.skipToContent}
      </a>

      <div className="flex min-h-dvh flex-col">
        {/*
          La banda cian. `--radius-band` son los 16px de Figma. En pantallas
          anchas se leen como una barra; en móvil, como una cabecera redondeada,
          que es exactamente lo que hace Figma en su lado estrecho.
        */}
        <header className="m-4 rounded-band bg-band sm:m-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/*
                `h1` es el título del sitio y va una sola vez en la página. Cada
                pantalla tiene su propio `h1` dentro de `main`; aquí el nombre va
                como enlace, no como encabezado, para no tener dos `h1`
                compitiendo por el mismo sitio en la jerarquía.
              */}
              <a
                href="#/"
                className="inline-flex min-h-target items-center text-3xl font-bold tracking-tight underline decoration-2 underline-offset-4 sm:text-nav"
              >
                {es.app.name}
              </a>

              <FontSizeControl />
            </div>

            <SiteNav currentKind={route.kind} />

            {session.user && (
              <p className="flex flex-wrap items-center gap-3 text-lg">
                <span>{format(es.login.signedInAs, { alias: session.user.alias })}</span>
                <button
                  type="button"
                  className="ui-button ui-button--secondary"
                  onClick={session.signOut}
                  disabled={session.signingOut}
                >
                  {session.signingOut ? es.login.signingOut : es.login.signOut}
                </button>
              </p>
            )}
          </div>
        </header>

        {/*
          `tabIndex={-1}`: `main` no es pulsable con el ratón, pero sí puede
          recibir el foco por script. Sin esto, el `focus()` que hace `App` al
          cambiar de página no funcionaría en varios navegadores (R-005).

          Aquí **no** se pone `focus:outline-none`: esa clase solo apaga el
          `outline` y dejaría vivo el `box-shadow` del anillo general, que
          dibujaría un recuadro alrededor de todo el contenido. El indicador de
          foco de `main` está en `index.css`, y es una barra en el borde
          superior en lugar de una caja.
        */}
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6"
        >
          {children}
        </main>

        <footer className="border-t border-border-soft">
          <p className="mx-auto max-w-4xl px-4 py-6 text-ink-muted sm:px-6">
            {es.footer.tagline}
          </p>
        </footer>
      </div>

      <RouteAnnouncer title={route.title} />
    </>
  )
}

export default Layout
