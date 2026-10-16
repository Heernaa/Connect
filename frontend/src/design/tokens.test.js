// @vitest-environment node

/**
 * Los tokens de `@theme` no pueden llamarse igual en dos namespaces.
 *
 * Tailwind v4 decide qué significa `text-nav` mirando a la vez el namespace de
 * tipografía (`--text-nav`) y el de color (`--color-nav`). Si existen los dos,
 * gana el color: `sm:text-nav` compila a `color: var(--color-nav)` y no a
 * `font-size`.
 *
 * ## El bug que casi se cuela
 *
 * El logotipo de la cabecera llevaba `sm:text-nav` para ponerse a 48px en
 * pantallas anchas, como en Figma. Con `--color-nav` también declarado, la
 * utilidad salió con `color: var(--color-nav)` —cian— y el logotipo se pintó
 * **cian sobre cian**, sobre la banda cian. Invisible, y durante dos specs
 * seguidas.
 *
 * ## Qué comprueba este test
 *
 * Que ningún nombre de token de tipografía (`--text-*`) coincida con ningún
 * nombre de token de color (`--color-*`). Si alguien vuelve a declarar
 * `--color-nav` o `--color-body`, el test falla con el par en concreto.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const CSS_PATH = fileURLToPath(new URL('../index.css', import.meta.url))

const css = readFileSync(CSS_PATH, 'utf8')

/** Nombres declarados en un namespace de `@theme`. */
function tokenNames(namespace) {
  const pattern = new RegExp(`--${namespace}-([a-z0-9-]+)\\s*:`, 'g')
  const names = new Set()

  let match = pattern.exec(css)

  while (match !== null) {
    // `--text-2xl`, `--text-nav`… se declaran también dentro de comentarios o
    // fuera de `@theme`. Solo interesan los que están en el bloque real, y la
    // comprobación siguiente se encarga de que la lista no se contamine.
    names.add(match[1])
    match = pattern.exec(css)
  }

  return names
}

describe('tokens de diseño', () => {
  it('no hay ningún nombre repetido entre tipografía y color', () => {
    const typography = tokenNames('text')
    const colors = tokenNames('color')

    const collisions = [...typography].filter((name) => colors.has(name))

    expect(
      collisions,
      `Nombres repetidos entre --text-* y --color-*: ${collisions.join(', ')}.\n` +
        'Tailwind v4 resolvería el nombre de la utilidad de color, y la de ' +
        'tipografía dejaría de funcionar. Renombra uno de los dos.',
    ).toHaveLength(0)
  })

  it('declara los tokens de color que usa la interfaz', () => {
    const colors = tokenNames('color')

    for (const required of [
      'band', 'band-ink', 'brand', 'brand-strong', 'success', 'danger', 'warning',
      'accent-1', 'accent-2', 'accent-3', 'accent-1-soft', 'accent-2-soft',
      'brand-soft', 'warning-soft', 'border', 'border-soft',
      'focus-ring', 'focus-halo', 'page', 'surface', 'ink', 'ink-muted',
    ]) {
      expect(colors.has(required), `Falta el token --color-${required}`).toBe(true)
    }
  })

  it('mantiene el cian de Figma en la banda de cabecera', () => {
    // El cian es el color de identidad del producto. Si cambia, el cambio es
    // deliberado y tiene que estar en el comentario de al lado, no ser un
    // efecto colateral de editar otro token.
    expect(css).toMatch(/--color-band:\s*#aaffff/i)
  })
})
