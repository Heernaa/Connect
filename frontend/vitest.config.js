import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Configuración de las pruebas unitarias del frontend (§5).
 *
 * Los tests viven junto al código, dentro de `src`, y se ejecutan con
 * `npm test`. El entorno es `jsdom` porque hay componentes de React, y se
 * cargan los `@testing-library/jest-dom` para poder escribir
 * `expect(element).toBeVisible()` en vez de comparaciones a mano.
 *
 * Va en un archivo aparte y no dentro de `vite.config.js` a propósito: son dos
 * cosas distintas (una compila y empaqueta la aplicación; la otra ejecuta
 * pruebas), y mezclarlas acaba poniendo opciones de test en la configuración de
 * producción.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    // Los tests de accesibilidad van en Playwright, no aquí: necesitan un
    // navegador de verdad. Este `exclude` deja claro que un test de axe-core no
    // pertenece a esta suite.
    exclude: ['node_modules', 'dist', 'e2e'],
  },
})
