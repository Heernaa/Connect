# Plan — Spec 006: Frontend accesible

**Estado:** implementada
**Progreso:** 31/31 tareas
**Rama:** `feature/spec-006-frontend-accesible`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 a R-003 — Tokens de diseño

- [x] 6.1 Definir la escala tipográfica en Tailwind con base 16px.
      → *R-001* — `src/index.css` (bloque `@theme`), base `1rem` y escala en `rem`.
- [x] 6.2 Implementar el control de tamaño de fuente con persistencia
      (localStorage) y tope del 200%.
      → *R-001* — `components/FontSizeControl.jsx`, `lib/textScale.js`,
      `hooks/useTextScale.js`. Se aplica en `main.jsx` antes de montar React.
- [x] 6.3 Definir una escala de espaciado que garantice los 44×44px como mínimo en
      todos los controles interactivos.
      → *R-002* — `--spacing-target: 2.75rem`, en `.ui-button`, `.ui-navlink`,
      `.ui-link` y `.ui-field__input`.
- [x] 6.4 Definir la paleta de colores y **verificar con una herramienta** que
      todos los pares cumplen 4.5:1 (3:1 en texto grande y bordes).
      → *R-003* — `design/contrastPairs.js`, con el motivo de cada par.
- [x] 6.5 Test o script que falle si algún par de colores baja del umbral.
      → *R-003* — `design/contrast.test.js` (45 comprobaciones). Lee los valores
      reales de `index.css`; si baja un par, el nombre del par y su motivo
      aparecen en el fallo.

### R-004 — Sin depender solo del color

- [x] 6.6 Documentar la regla y aplicarla a los componentes que transmiten
      estado por color (base para Wordle).
      → *R-004* — `components/ui/StatusIndicator.jsx` exige color + icono + texto;
      la regla se explica en [`Docs/sistema-diseno.md`](../../sistema-diseno.md)
      §5 y se comprueba en `e2e/rules.spec.js`, también en `forced-colors`.

### R-005 — Navegación por teclado

- [x] 6.7 Implementar el anillo de foco visible en todos los elementos
      interactivos, con contraste suficiente sobre cualquier fondo.
      → *R-005* — `:focus-visible` de dos tonos en `index.css`, más la
      adaptación a `forced-colors`.
- [x] 6.8 Verificar el orden del foco y añadir enlace de salto al contenido
      principal.
      → *R-005* — enlace de salto en `Layout.jsx`, foco a `main` al cambiar de
      vista, `RouteAnnouncer` y título del documento.
- [x] 6.9 Comprobar que no hay trampas de foco en menús o diálogos.
      → *R-005* — `e2e/keyboard.spec.js` recorre las cuatro pantallas; no hay
      diálogos ni menús que atrapen el foco en esta spec.

### R-006 — HTML semántico

- [x] 6.10 Crear la estructura base del documento con `lang="es"`, encabezados
      jerárquicos correctos y `main`.
      → *R-006* — `lang` comprobado en `design/document.test.js`; encabezados y
      `main` en `Layout.jsx` y las cuatro pantallas.
- [x] 6.11 Implementar los componentes base (botón, campo, tarjeta) con
      HTML nativo y `label` asociado.
      → *R-006* — `components/ui/{Button,TextField}.jsx` y las clases `.ui-card`,
      `.ui-field*`. `id` por instancia con `useId`.

### R-007 — Diccionario de textos

- [x] 6.12 Crear el diccionario central con todas las cadenas de la UI en
      español llano.
      → *R-007* — `i18n/es.js`, con `i18n/format.js` para los textos con huecos.
- [x] 6.13 Verificar con grep que no queda ninguna cadena hardcodeada en los
      componentes.
      → *R-007* — `i18n/dictionary.test.js` recorre `src`, quita comentarios y
      `className`, y distingue palabras «fuertes» de funcionales.

### R-008 a R-010 — Animación, mensajes y reflow

- [x] 6.14 Respetar `prefers-reduced-motion` en todas las animaciones y
      transiciones.
      → *R-008* — `index.css`; `.ui-enter` solo existe con
      `prefers-reduced-motion: no-preference`. Comprobado midiendo la duración
      real en `e2e/rules.spec.js`.
- [x] 6.15 Implementar el componente de error y de validación en lenguaje
      llano, asociado al campo y anunciado.
      → *R-009* — `components/ui/ErrorMessage.jsx` con `role="alert"`, y
      `TextField` con `aria-invalid` y `aria-describedby`.
- [x] 6.16 Comprobar reflow a 360px y con zoom al 200%: sin scroll horizontal
      ni solapamientos.
      → *R-010* — `e2e/reflow.spec.js` mide `scrollWidth` en las cuatro
      pantallas y en los tres anchos, y comprueba que no se solapen secciones.

### R-011 — Páginas base

- [x] 6.17 Portada con bienvenida, registro, login y enlace a clasificación.
      → *R-011* — `pages/HomePage.jsx`. El enlace a la clasificación lleva a una
      página que explica que todavía no está lista, no a un callejón sin salida.
- [x] 6.18 Lista de juegos con nombre, descripción y estado.
      → *R-011* — `pages/GamesPage.jsx`. Nombre y descripción los sirve la API.
- [x] 6.19 Pantallas de registro y de login, con validación accesible.
      → *R-011* — `pages/{RegisterPage,LoginPage}.jsx`, con
      `lib/validation.js`. Al validar, el foco va al primer campo con error.

### R-012 — Auditoría de accesibilidad

- [x] 6.20 Configurar Playwright con axe-core y auditar las cuatro pantallas
      base.
      → *R-012* — `playwright.config.js` y `e2e/accessibility.spec.js`. Se
      auditan también el estado de error del formulario y la clasificación.
- [x] 6.21 Dejar la auditoría en la suite de pruebas, de modo que una
      violación nueva rompa la build.
      → *R-012* — `npm run test:all` encadena lint, tests y auditoría.

### R-013 — Validación en el cliente

- [x] 6.22 Implementar la validación en tiempo de ejecución de los datos de la
      API, con mensaje claro si el formato no cuadra.
      → *R-013* — `lib/validators.js` (43 casos en `validators.test.js`) y
      `lib/api.js`. Los mensajes del servidor se enseñan tal cual.

### Rediseño visual — Figma «Abuelos»

Cambia **cómo se ve**, no **qué se cumple**: R-001 a R-013 siguen siendo los
mismos y todos siguen verificables. Por el método spec-anchored (§0.3) los
requisitos se cambian antes que el código, así que `spec.md` no se toca: aquí no
hay requisito nuevo.

El diseño de partida es el de Figma, y hay dos cosas que no se copian tal cual,
con el ratio medido:

| En Figma | Contexto | Ratio | Aquí | Ratio |
|---|---|---|---|---|
| `#00C000` + blanco | Tarjeta de juego | **2.46:1** ✗ | `#15803D` | 5.02:1 ✓ |
| `#00BDC0` + blanco | Hover de la tarjeta | **2.32:1** ✗ | `#0F6E75` | 5.99:1 ✓ |
| `#AAFFFF` + blanco | Cabecera | **1.14:1** ✗ | Casi negro encima | 15.76:1 ✓ |

Y un motivo que no es de color: el anillo de foco `#0B5FFF` sobre verde profundo
daba **1.02:1** y sobre teal **1.17:1**. Por eso la tarjeta es clara y el color va
en una banda de acento, para que el foco siempre caiga sobre blanco.

- [x] 6.23 Actualizar `contrastPairs.js` con la paleta nueva **antes** de tocar el
      CSS, para que el test obligue a pensar el contraste.
      → *R-003*
- [x] 6.24 Tokens de color, radios y tipografía en `index.css`.
      → *R-001, R-002, R-003* — radios de Figma (24px tarjeta, 16px banda, 12px
      controles) y `--text-nav-scale` con `clamp()` para que la navegación
      responda al ancho y a la fuente a la vez.
- [x] 6.25 Tarjeta clara con borde y elevación; sombra solo para profundidad.
      → *R-003* — la sombra no dibuja estructura, para eso están los bordes.
- [x] 6.26 Cabecera cian con la navegación dentro, radio 16px.
      → *R-011* — en Figma cabecera y menú son la misma banda.
- [x] 6.27 `GameCard` con banda de acento, título 40px y descripción 24px.
      → *R-011, R-004* — el acento se asigna por `gameId`, nunca por posición.
- [x] 6.28 Portada en rejilla de tarjetas.
      → *R-011*
- [x] 6.29 Formularios con tarjeta centrada de ancho limitado.
      → *R-011, R-006*
- [x] 6.30 Documentar el lenguaje visual: `Docs/sistema-diseno.md` reescrito, y
      decisión anotada en la constitución y en los índices.
      → *R-003, R-004*
- [x] 6.31 Reverificar todo: contraste, teclado, 44px, reflow a 360px y al 200%,
      axe-core y compilación.
      → *R-002, R-005, R-010, R-012*

## Verificación de la spec

- [x] V.1 La fuente llega al 200% y persiste al recargar.
      → `src/lib/textScale.test.js` + `e2e/reflow.spec.js`.
- [x] V.2 Todos los botones miden 44×44px o más.
      → `e2e/keyboard.spec.js`, medidos en el navegador real.
- [x] V.3 axe-core no reporta violaciones A ni AA.
      → `e2e/accessibility.spec.js`: **0 violaciones** en las cuatro pantallas.
- [x] V.4 El recorrido es navegable solo con teclado.
      → `e2e/keyboard.spec.js`.
- [x] V.5 El foco es visible en todo elemento interactivo.
      → `e2e/keyboard.spec.js`.
- [x] V.6 No hay texto hardcodeado en componentes.
      → `src/i18n/dictionary.test.js`.
- [x] V.7 `prefers-reduced-motion` desactiva las animaciones.
      → `e2e/rules.spec.js`.
- [x] V.8 Sin scroll horizontal a 360px ni al 200%.
      → `e2e/reflow.spec.js`.
- [x] V.9 Los errores se muestran en lenguaje llano.
      → `src/components/ui/ui.test.jsx` y `src/pages/pages.test.jsx`.
- [x] V.10 El documento declara `lang="es"`.
      → `src/design/document.test.js`.
- [x] V.11 Datos inválidos producen mensaje, no pantalla rota.
      → `src/lib/validators.test.js` y `src/pages/pages.test.jsx`.

## Notas

- La tarea 6.4 (verificar contraste) **se ha hecho con una herramienta**: el test
  lee los tokens reales del CSS y mide WCAG 2.x. Ningún ratio está estimado.
- La auditoría axe-core (6.20) es **automatizada**. No sustituye a la revisión
  manual del checklist de §4.1 y §4.2, que sigue siendo obligatoria (§4.3): axe
  detecta lo que sabe medir, y no sabe si un mensaje se entiende.
- Los tokens de diseño creados aquí son la base de los juegos. Si un juego
  necesita un patrón visual nuevo, se añade **al sistema**, no se resuelve
  dentro del componente del juego (§1.3, §3.3).
- **Decisión de enrutado:** enrutador propio por hash (~90 líneas), sin
  `react-router-dom`. Para cuatro pantallas no hace falta una librería, y §6.7
  obliga a justificar cada dependencia nueva. Cuando aparezca una necesidad que no
  se pueda cubrir —rutas anidadas, parámetros, protección de rutas con red— se
  añade la librería y se borra `router.jsx`. No antes.
- **Rutas en inglés, rótulos en español** (§3.1). `#/games` es un identificador;
  lo que se ve sale del diccionario.
- **Un hash desconocido lleva a la portada**, no a una pantalla de error
  (§2.1.6): el producto no puede tener callejones sin salida.

## Fallos reales que encontró la auditoría

Se dejan escritos porque explican por qué hay tests que existen:

1. **`label-content-name-mismatch` (WCAG 2.5.3).** Los botones `A−`/`A+` tenían
   `aria-label` que no contenía el texto visible. Quien usa reconocimiento de voz
   oía «A» y decía «A», y el botón no respondía. Ahora llevan glifo visible y
   explicación en `sr-only`.
2. **El foco saltaba a `main` en la primera carga.** `StrictMode` ejecuta el
   efecto dos veces y la guarda de «primer render» se gastaba en el primer
   montaje. Ahora se compara con la ruta anterior.
3. **Scroll horizontal a 360px con el texto al 200%** (421px en una ventana de
   360px). El culpable era `.ui-status`: `inline-flex` sin `min-width: 0` en el
   texto, que no se parte nunca. Arreglado en el token, no en el componente.
4. **El enlace del nombre medía 36px de alto**, por debajo del objetivo táctil.
5. **La validación del login proponía «la contraseña necesita al menos 8
   caracteres»**, que revela si el fallo es la contraseña y permite enumerar
   cuentas (§6.3). Ahora solo pide que se escriba.
6. **`--text-nav` y `--color-nav` en el mismo `@theme`.** Tailwind v4 resuelve
   `text-nav` de forma ambigua y `sm:text-nav` compilaba a
   `color: var(--color-nav)`. El logotipo «Connect» quedó cian sobre cian,
   invisible, y llevaba así desde la spec 001. Ahora el color se llama
   `--color-band`, y `src/design/tokens.test.js` impide la repetición.
7. **El anillo de foco encerraba todo el contenido.** `main` recibía el foco por
   script y heredaba el anillo exterior de `:focus-visible`, un recuadro azul de
   casi mil píxeles. `focus:outline-none` no lo arreglaba: apaga el `outline` y
   deja vivo el `box-shadow`. Ahora es una barra en el borde superior.
