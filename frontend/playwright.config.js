import { defineConfig, devices } from '@playwright/test'

/**
 * Configuración de Playwright: E2E y accesibilidad (§5, §7.1, spec 008 · R-006).
 *
 * Decisiones:
 *
 * · **Tres proyectos, uno por dispositivo, con el mismo peso.** §7.1 dice que no
 *   hay dispositivo principal: los tres perfiles ejecutan **toda** la suite,
 *   los recorridos contra el backend real (`e2e/journeys/`) y la auditoría con
 *   respuestas simuladas (`e2e/*.spec.js`). Los tamaños son los de la tabla de
 *   §7.1: ordenador ancho completo, tablet de 810px y móvil **de 360px**, que es
 *   el mínimo que fija la constitución.
 * · **Un solo motor, chromium.** Los perfiles cambian la ventana, la densidad y
 *   el tacto; no el motor. Abrir WebKit o Firefox multiplicaría el tiempo de
 *   suite sin añadir ningún requisito de §7.1, que habla de dispositivos, no de
 *   navegadores. Por eso `browserName` va **después** del reparto de dispositivo:
 *   en los descriptores de tablet el navegador por defecto es `webkit` y aquí
 *   sería un cambio silencioso de motor.
 * · **`webServer` levanta Vite solo.** La suite debe poder correr con un comando
 *   y sin recordar de arrancar un servidor en otra terminal. Si el servidor ya
 *   está levantado, Playwright lo reutiliza (`reuseExistingServer`).
 * · **Las rutas de la API se interceptan solo donde hace falta.** La auditoría de
 *   accesibilidad y los tests de reglas van contra respuestas simuladas, para
 *   que sean reproducibles sin PostgreSQL (§4.3). Los recorridos de
 *   `e2e/journeys/` **no interceptan nada**: comprueban la aplicación real, y
 *   si el backend no está en pie fallan con un aviso que dice qué falta.
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
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], browserName: 'chromium' },
    },
    {
      // 810×1080: tablet en vertical, con táctil (§7.1).
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'], browserName: 'chromium' },
    },
    {
      // 360×740: el mínimo que fija §7.1 para móvil.
      name: 'mobile',
      use: { ...devices['Galaxy S8'], browserName: 'chromium' },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
