import { FontSizeControl } from '../components/FontSizeControl.jsx'
import { ServiceStatus } from '../components/ServiceStatus.jsx'
import { es } from '../i18n/es.js'
import { routeHref } from '../routes.js'

/**
 * Portada (R-011).
 *
 * Cumple las tres cosas que la spec pide: bienvenida, acceso al registro y al
 * login, y enlace a la clasificación.
 *
 * Dos decisiones que no son obvias:
 *
 * · Los enlaces a registro y login son **enlaces** (`<a href="#/register">`),
 *   no botones. Cambian de sitio, y quien usa teclado o lector de pantalla
 *   necesita oír «enlace» y poder abrirlos en otra pestaña (R-005).
 * · El enlace a la clasificación va a una página que explica que todavía no
 *   está lista, no a un error ni a un sitio vacío. Un enlace roto es un callejón
 *   sin salida, y el producto se compone de que no haya ninguno (§2.1.6).
 */
export function HomePage() {
  return (
    <div className="flex flex-col gap-8">
      {/*
        La tarjeta de bienvenida, en el cian de la banda de cabecera. En Figma el
        cian es el color de identidad del producto; aquí se usa una vez, arriba,
        para que siga siendo una señal y no un ruido.
      */}
      <section aria-labelledby="welcome" className="ui-card bg-band">
        <h1 id="welcome" className="ui-enter text-display font-bold tracking-tight">
          {es.home.heading}
        </h1>

        <p className="ui-enter ui-enter--delay-1 mt-4 max-w-prose text-body">
          {es.app.description}
        </p>
        <p className="ui-enter ui-enter--delay-2 mt-3 max-w-prose text-body">
          {es.home.intro}
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <a className="ui-button ui-button--primary" href={routeHref('register')}>
            {es.home.ctaRegister}
          </a>
          <a className="ui-button ui-button--secondary" href={routeHref('login')}>
            {es.home.ctaLogin}
          </a>
        </div>
      </section>

      <section aria-labelledby="what-you-can-do" className="ui-card">
        <h2 id="what-you-can-do" className="text-2xl font-bold tracking-tight">
          {es.home.whatIsTitle}
        </h2>

        <ul className="mt-5 grid list-none grid-cols-1 gap-4 text-body sm:grid-cols-3">
          <li className="flex flex-col gap-2">
            {/*
              El número va dentro de una banda de acento. Es decorativo —la
              lista se entiende leyendo los textos—, así que queda fuera del
              anuncio del lector de pantalla (R-004).
            */}
            <span aria-hidden="true" className="ui-accent-band ui-accent-band--chip">
              1
            </span>
            <span>{es.home.whatIsPlay}</span>
          </li>
          <li className="flex flex-col gap-2">
            <span aria-hidden="true" className="ui-accent-band ui-accent-band--chip">
              2
            </span>
            <span>{es.home.whatIsPause}</span>
          </li>
          <li className="flex flex-col gap-2">
            <span aria-hidden="true" className="ui-accent-band ui-accent-band--chip">
              3
            </span>
            <span>{es.home.whatIsCommunity}</span>
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-6">
          <a className="ui-link" href={routeHref('games')}>
            {es.home.ctaGames}
          </a>
          <a className="ui-link" href={routeHref('leaderboard')}>
            {es.home.ctaLeaderboard}
          </a>
        </div>
      </section>

      <ServiceStatus />

      {/*
        El control de tamaño aparece también en la portada, y no solo en la
        cabecera: quien acaba de llegar y no ve bien tiene que poder arreglarlo
        sin tener que encontrar el botón de arriba. Están los dos a propósito;
        ambos leen del mismo estado y se mueven a la vez.
      */}
      <section aria-labelledby="text-size-section" className="ui-card">
        <h2 id="text-size-section" className="text-2xl font-bold tracking-tight">
          {es.accessibility.textSize}
        </h2>
        <p className="mt-2 text-lg text-ink-muted">{es.accessibility.textSizeHint}</p>
        <FontSizeControl className="mt-4" />
      </section>
    </div>
  )
}

export default HomePage
