// @vitest-environment node

/**
 * El documento declara su idioma (R-006, §4.2).
 *
 * `lang="es"` no es un detalle: es lo que hace que un lector de pantalla lea
 * «Conectar» con la pronunciación española y no con la inglesa, y lo que permite
 * que las reglas de puntuación se apliquen bien. Sin él, toda la interfaz
 * existe en un idioma que el lector de pantalla no cree.
 *
 * Se comprueba leyendo `index.html` y no el DOM porque `index.html` es la
 * fuente: es el documento que se sirve, y en jsdom no se carga.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const INDEX_HTML = fileURLToPath(new URL('../../index.html', import.meta.url))

describe('documento (R-006)', () => {
  const html = readFileSync(INDEX_HTML, 'utf8')

  it('declara lang="es" en el elemento html', () => {
    const tag = html.match(/<html[^>]*>/)?.[0] ?? ''

    expect(tag).toContain('lang="es"')
  })

  it('no se renderiza ni un solo texto como imagen', () => {
    // R-001: ningún texto va incrustado como imagen. Un texto en una imagen no
    // se puede ampliar, no lo lee el lector de pantalla y no lo traducirá
    // nadie.
    expect(html).not.toMatch(/<img/i)
  })

  it('tiene el viewport para que el móvil no la encoja sola', () => {
    // Sin `viewport`, un móvil aplica un ancho de página de ~980px y deja el
    // texto minúsculo: el problema opuesto a tener cuidado con los usuarios
    // mayores (R-010, §7.1).
    expect(html).toMatch(/<meta[^>]*name="viewport"[^>]*width=device-width/i)
  })

  it('no bloquea el renderizado esperando a un script de terceros', () => {
    // §6.4: nada de terceros. Un script externo bloquearía la pantalla y sería
    // además una petición a un servidor ajeno que puede rastrear a la persona.
    const externalScripts = html.match(/<script[^>]*src=["'](https?:)?\/\//gi) ?? []

    expect(externalScripts).toHaveLength(0)
  })

  it('carga la tipografía desde el paquete, no desde un CDN', () => {
    const externalStyles = html.match(/<link[^>]*href=["'](https?:)?\/\//gi) ?? []

    expect(externalStyles).toHaveLength(0)
  })
})
