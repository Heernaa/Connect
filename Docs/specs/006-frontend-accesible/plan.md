# Plan — Spec 006: Frontend accesible

**Estado:** implementada
**Progreso:** 44/44 tareas
**Rama:** `feature/spec-006-frontend-accesible` (continúa sobre el merge de 007)
**Spec:** [`spec.md`](./spec.md)

> **Ampliación de alcance del 2026-10-16.** Esta spec pasó de ser solo-frontend a
> incluir las tres pantallas de juego (R-014 a R-020). El motivo está en
> [`spec.md` §2.bis](./spec.md): la versión anterior remitía a «specs de la
> fase 6» para los juegos que nunca se escribieron, y su consecuencia fue una
> API completa sin ninguna pantalla donde jugar.

## Tareas — la base (R-001 a R-013)

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

## Tareas — los juegos (R-014 a R-020)

### Contrato con la API (R-019, R-018)

- [x] 6.32 `GET /api/games`: añadir `played` y `score` por juego, sin quitar ni
      cambiar los campos que ya había.
      → *R-018*, *R-019* — `schemas/games.py::GameSummary`. Sin sesión se
      devuelven los valores neutros, y la lista se ve igual (§2.4).
- [x] 6.33 `POST /api/games/{id}/abandon`.
      → *R-015*, *R-019* — escribe la columna `abandoned`, que existe desde la
      spec 002 y no tenía nada que la escribiera.
- [x] 6.34 `POST /api/games/riddle/report` y su tabla de reportes.
      → *R-017*, *R-019* — guarda lo escrito y el acertijo. Nada más: ni
      `username`, ni IP. Sin moderadores, igual que el chat (§6.8).
- [x] 6.35 Tests de los tres endpoints nuevos.
      → *R-015*, *R-017*, *R-018*, *R-019*

### Los tres juegos (R-014, R-016)

- [x] 6.36 Validadores de cliente para las respuestas de los juegos.
      → *R-014*, y R-013 — la forma se comprueba antes de pintar nada.
- [x] 6.37 `ParaulogicPage`: letras, campo para escribir, palabras encontradas,
      botón de pista y contador de pendientes.
      → *R-014*, *R-016* — intentos ilimitados, sin estado de derrota. El
      contador de pendientes **resta al encontrar**, no se queda en el total.
- [x] 6.38 `WordlePage`: cinco huecos, teclado en pantalla, historial de
      intentos con las tres pistas por letra.
      → *R-014*, *R-016* — cada pista por **texto e icono** (§2.1.4). Teclado en
      pantalla porque es lo que permite jugar sin precisión motora fina.
- [x] 6.39 `RiddlePage`: enunciado, respuesta y reporte tras un rechazo.
      → *R-014*, *R-016*, *R-017*
- [x] 6.40 «Saltar partida» en las tres pantallas, más el enlace a la lista.
      → *R-015* — un solo paso, sin confirmar. En Wordle avisa de que consume
      la única partida, porque eso sí es irreversible.
- [x] 6.41 Los patrones visuales nuevos, **en el sistema de diseño**.
      → *R-016* — la fila de letras, el tablero y el contador van a `index.css`
      y a `contrastPairs.js`, no dentro del componente (§3.3).
- [x] 6.42 La lista de juegos dice el estado real, sin escribirlo a mano.
      → *R-018* — se elimina el «Sin jugar» fijo y el comentario que lo admitía.
- [x] 6.43 Enlazar el botón «Jugar» de cada tarjeta con su juego.
      → *R-014*

### Verificación (R-020, y R-002, R-005, R-010)

- [x] 6.44 Auditar con axe las tres pantallas en **todos** sus estados: vacío,
      con palabras escritas, con error de validación, terminado y con Wordle ya
      jugado.
      → *R-020* — auditar solo el estado vacío no comprueba nada.
- [x] 6.45 Recorrido completo de un juego solo con teclado, en las tres pantallas.
      → *R-014*, R-005
- [x] 6.46 Reflow a 360px y con la fuente al 200% en las tres pantallas.
      → *R-010*

## Fallos reales que encontraron los juegos

Se dejan escritos porque explican por qué hay tests que existen:

1. **La clave del mapa de rutas era distinta del `path`.** `#/game/paraulogic`
   buscaba la clave `paraulogic`, no la encontraba y caía en la portada sin
   decir nada. `resolveRoute` devuelve la portada cuando no encuentra la clave, y
   eso **parece** funcionar. Ahora `routes.test.js` falla si clave y ruta dejan de
   coincidir.
2. **El estado «jugado» no venía en la respuesta de los juegos**, así que el
   validador rechazaba el catálogo entero y la lista se quedaba vacía. No lo dio
   un fallo visible: dio una pantalla en blanco con un aviso de «la información no
   se ha podido leer», que es exactamente lo que hay que evitar (R-013).
3. **`game_id: null` no es un campo que falta.** En la vista global de la
   clasificación y en los mensajes del sistema, `null` es un valor legítimo. Los
   validadores lo normalizan a `null` en vez de rechazarlo, y `?? null` a secas no
   servía porque convertía también un `0` o un `""`.
4. **La casilla «no está» de Wordle sobre la tarjeta da 1.15:1.** Poner el
   relleno a un gris oscuro para llegar a 3:1 convertiría el estado neutro en el
   más oscuro de los tres. Lo que dibuja la casilla es su **borde**, que sí llega
   a 3:1, y lo que dice el estado es el **glifo**. El par está documentado en
   `contrastPairs.js` con el motivo, para que nadie lo «arregle» subiéndolo.
5. **Escribir los puntos en el cliente.** El acertijo pintaba «+10 puntos» escrito
   a mano. La respuesta del servidor al comprobar no trae la puntuación, así que
   el número habría estado en dos sitios y la pantalla mentiría el día que
   cambiara. Ahora se recarga la partida y lo dice el servidor (§6.6).

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

### De los juegos

- [x] V.12 Se juega a los tres juegos enteros solo con teclado.
- [x] V.13 «Saltar partida» es visible en las tres y no pierde progreso.
- [x] V.14 Volver a un juego restaura el progreso y avisa de que no es la
      primera vez.
- [x] V.15 Las tres pistas de Wordle se distinguen sin color.
- [x] V.16 El reporte de acertijo solo aparece tras un rechazo, no da puntos, y
      se puede volver a ver.
- [x] V.17 La lista de juegos dice el estado real de los tres.
- [x] V.18 axe no reporta violaciones en las pantallas de juego, en ningún
      estado.

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
