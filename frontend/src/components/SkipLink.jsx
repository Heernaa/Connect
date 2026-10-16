import { es } from '../i18n/es.js'

/**
 * Enlace de salto al contenido.
 *
 * Va el primero en el DOM y solo es visible al recibir el foco por teclado. Sin
 * él, una persona que navega con teclado tendría que recorrer toda la barra de
 * navegación en cada página para llegar al contenido.
 */
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-3 focus:text-lg focus:font-semibold"
    >
      {es.accessibility.skipToContent}
    </a>
  )
}