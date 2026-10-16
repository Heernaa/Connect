# frontend — Interfaz de Connect

React + Tailwind CSS, en **JavaScript** (§3.2). Aquí vive la mecánica de los
juegos y toda la capa accesible.

## Estructura

```
src/
  i18n/es.js         Diccionario de la interfaz. Ninguna cadena en componentes
  lib/api.js         Cliente de la API, con validación en tiempo de ejecución
  components/        Componentes reutilizables
  index.css          Tokens de diseño y estilos base
  pages/             Una pantalla por ruta, en `routes.js`
  App.jsx            Enrutado y sesión

e2e/
  *.spec.js          Auditoría y reglas, con la API simulada
  journeys/          Recorridos contra la aplicación real (spec 008)
  helpers.js         Respuestas simuladas y utilidades compartidas
```

## Arranque

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # bundle de producción en dist/
npm run lint         # oxlint
```

## Pruebas

```bash
npm test             # Vitest: componentes, validadores, diccionario, tokens
npm run test:e2e     # Playwright: E2E, teclado, reflow y axe-core
npm run test:all     # todo lo anterior, en orden
```

`npm run test:e2e` corre **toda** la suite de Playwright en los tres perfiles de
dispositivo del proyecto: `desktop`, `tablet` y `mobile`.

Son dos tipos de test y la diferencia importa:

- `e2e/*.spec.js` **intercepta la API** con respuestas simuladas. Auditan la
  interfaz sin depender de PostgreSQL, y por eso funcionan con el backend caído.
- `e2e/journeys/*.spec.js` **no intercepta nada**: son los recorridos de la spec
  008 contra la aplicación real, con la puntuación que calcula el servidor y el
  progreso que guarda en PostgreSQL. Necesitan `docker compose up` en marcha; si
  el backend no contesta, fallan diciéndolo en lugar de con un error de red.

Para un solo proyecto: `npx playwright test --project=mobile`.

Dentro de Docker, `docker compose up` ya lo levanta en
<http://localhost:5173>.

## La API en desarrollo

El frontend llama a `/api/...` y el servidor de Vite reenvía la petición al
backend (configurado en `vite.config.js`). Así el código no necesita saber en
qué host está la API, y en desarrollo no hay CORS ni doble configuración (§2.5).

## Tokens de diseño

`src/index.css` es la fuente de los tokens. Vienen del diseño de Connect en
Figma, **adaptados a WCAG 2.2 AA**:

- Se conserva la barra de navegación en cian `#AAFFFF`, Inter y la escala
  tipográfica grande de la navegación (48 px).
- Se cambian los colores que no llegan a 4.5:1 de contraste: el verde de las
  tarjetas pasa de `#00C000` (2.46:1) a `#166534` (7.13:1), el rojo de los
  botones de `#FF0000` (4.00:1) a `#B3261E` (6.54:1) y el gris de borde de
  `#9AA5AD` (2.51:1) a `#6B7680` (4.64:1). La forma no cambia; cambia el valor
  para que el texto se pueda leer.

Cuando llegue la spec 006, aquí se bborrará el sistema completo de tokens
accesibles. Lo de ahora son los valores base que ya no habrá que cambiar.

## Reglas que no se saltan aquí

- **Fuente base 16 px** en `rem`, ampliable al 200 % con el zoom (§4.1).
- **Objetivos táctiles de 44 × 44 px** como mínimo.
- **Ninguna señal solo por color**: siempre texto e icono (§4.1).
- **Todas las cadenas salen de `i18n/es.js`**, nunca escritas en un componente.
- **Los datos de la API se validan antes de usarse**: sin tipado estático, pero
  tampoco confianza ciega (§3.2).
- **El contenido de los juegos no se escribe aquí**: lo sirve la API (§2.1.2).