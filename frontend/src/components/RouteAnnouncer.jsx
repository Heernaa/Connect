/**
 * Anuncia el cambio de página (R-005).
 *
 * Al pulsar un enlace, quien navega con lector de pantalla oye el texto nuevo
 * pero **no ve** que ha cambiado la pantalla: el foco se queda en el enlace,
 * arriba, y la página entera se ha sustituido debajo. El resultado es que
 * alguien que no ve la pantalla no sabe dónde está.
 *
 * Aquí se arregla con las dos piezas que juntas funcionan:
 *
 * 1. Un aviso `aria-live="polite"` que lee el título de la página nueva.
 * 2. El foco se lleva a `main` (lo hace `App`), para que quien navega solo con
 *    teclado empiece por el contenido y no tenga que recorrer la página.
 *
 * `polite` y no `assertive`: cambiar de página no es una urgencia, y
 * no interrumpir lo que se estaba leyendo molesta más de lo que ayuda.
 *
 * El texto se pone en `sr-only` a propósito. Es información para el lector de
 * pantalla, no algo que deba ocupar sitio visible: quien ve la pantalla ya ve
 * que ha cambiado de página.
 */
export function RouteAnnouncer({ title }) {
  return (
    <div aria-live="polite" className="sr-only">
      {title}
    </div>
  )
}

export default RouteAnnouncer
