/**
 * Página de una funcionalidad que todavía no existe (spec 007).
 *
 * Existe para que el enlace de la portada **no sea un callejón sin salida**
 * (§2.1.6: ninguna cuenta se queda bloqueada sin salida). Un enlace a la
 * clasificación es obligatorio en la portada (R-011); que la clasificación no
 * esté hecha es otra cosa, y se resuelve explicándolo con claridad en lugar de
 * dejar un 404 o una pantalla vacía.
 *
 * El patrón se reutiliza tal cual para el chat.
 */
import { es } from '../i18n/es.js'

export function UpcomingPage({ heading, intro }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>

      {/* El aviso no es un error: no hay nada que arreglar, así que no lleva
          `role="alert"` ni el icono de fallo. */}
      <p className="ui-card bg-brand-soft max-w-prose text-lg">{intro}</p>

      <a className="ui-link" href="#/">
        {es.common.backHome}
      </a>
    </div>
  )
}

export default UpcomingPage
