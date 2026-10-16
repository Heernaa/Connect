import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright: E2E y accesibilidad (§5, R-012).
 *
 * Decisiones:
 *
 * · **`webServer` levanta Vite solo.** La suite debe poder correr con un comando
 *   (`npm run test:a11y`) y sin recordar de arrancar un servidor en otra terminal. Si
 *   el servidor ya está levantado, Playwright lo reutiliza (`reuseExistingServer`).
 * · **Las rutas de la API se interceptan.** Las pantallas se montan contra
 *   respuestas simuladas: la auditoría de accesibilidad tiene que ser
 *   reproducible y no depender de que PostgreSQL esté levantado. La comprobación
 *   de que la API real sirve esos datos es de la spec 004, no de esta.
 * · **Un solo navegador, chromium.** Los tres perfiles de dispositivo (móvil,
 *   tablet, ordenador) se prueban aquí porque R-010 exige no perder contenido a
 *   360px ni al 200% de zoom. Los E2E completos en los tres dispositivos, con
 *   las partidas de los juegos, son de la spec 008.
 * · **Sin servidor web de aplicación que arranque**: en local no hay HTTPS ni
 *   nada que proteger (§7.0).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Una auditoría que falla por culpa de otra es un informe que nadie se cree.
  retries: 0,
  reporter: process.env.CI ? 'list' : [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    // El idioma del navegador, no el del sistema. Si el runner está en inglés,
    // los mensajes nativos del navegador saldrían en inglés y la auditoría
    // estaría midiendo otra cosa (R-009).
    locale: 'es-ES',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
