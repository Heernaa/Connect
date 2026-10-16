import { ServiceStatus } from './components/ServiceStatus.jsx'
import { SkipLink } from './components/SkipLink.jsx'
import { es } from './i18n/es.js'

export default function App() {
  return (
    <>
      <SkipLink />

      <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
        <header>
          {/* h1 único en la página: es el título de la vista, no un título
              visual más grande. */}
          <h1 className="text-3xl font-bold tracking-tight sm:text-nav">{es.app.name}</h1>
          <p className="mt-2 text-xl text-ink-muted">{es.app.tagline}</p>
        </header>

        <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">
          <section
            aria-labelledby="presentacion"
            className="rounded-card bg-nav p-6 text-nav-ink sm:p-8"
          >
            <h2 id="presentacion" className="text-2xl font-bold">
              {es.home.heading}
            </h2>
            <p className="mt-3 max-w-prose text-lg">{es.app.description}</p>
            <p className="mt-3 max-w-prose text-lg">{es.home.intro}</p>
            <p className="mt-4 max-w-prose font-semibold">{es.home.comingSoon}</p>
          </section>

          <div className="mt-8">
            <ServiceStatus />
          </div>
        </main>

        <footer className="border-t border-border-soft pt-4 text-ink-muted">
          <p>{es.app.tagline}</p>
        </footer>
      </div>
    </>
  )
}