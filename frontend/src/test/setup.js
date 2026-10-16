import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Preparación común a los tests de componentes (R-007, R-012).
 *
 * `cleanup` desmonta lo que cada test ha montado. Sin esto, el DOM se acumula
 * entre tests y `getByRole` empieza a encontrar elementos de pruebas anteriores:
 * un fallo que aparece de pronto y se va de pronto es la forma más cara de
 * perder tiempo.
 *
 * `localStorage` se vacía entre tests. El tamaño del texto y la sesión se
 * guardan ahí, y un test que deje un 200% puesto cambia el tamaño de todo lo que
 * se monte después.
 */
// Algunos tests declaran entorno `node` porque no necesitan DOM (el de contraste
// solo lee un archivo). El setup se ejecuta también para ellos, así que cada
// línea comprueba que hay ventana antes de tocar la ventana.
afterEach(() => {
  if (typeof window === 'undefined') return

  cleanup()
  window.localStorage.clear()
})
