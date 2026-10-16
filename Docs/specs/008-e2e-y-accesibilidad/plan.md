# Plan — Spec 008: E2E y verificación de accesibilidad

**Estado:** implementada y verificada — pendiente la firma manual
**Progreso:** 12/13 tareas implementadas; 8.12 pendiente de verificación humana
**Rama:** `feature/spec-008-e2e-y-accesibilidad`
**Spec:** [`spec.md`](./spec.md)

> 8.12 requiere que una persona recorra y firme el checklist.

## Tareas

### R-001 y R-002 — Recorridos E2E de los juegos

- [x] 8.1 Configurar Playwright con los tres perfiles de dispositivo
      (ordenador, tablet, móvil).
      → *R-006*
      → `frontend/playwright.config.js`: proyectos `desktop` (1280×720),
      `tablet` (810×1080) y `mobile` (360×740, el mínimo de §7.1). Chromium en
      los tres: los perfiles cambian ventana y tacto, no motor.
- [x] 8.2 E2E del flujo completo: registro → login → jugar → clasificación.
      → *R-001*
      → `frontend/e2e/journeys/journey.spec.js`, un solo test porque lo que se
      comprueba es que el camino **encadenado** funciona.
- [x] 8.3 E2E de Paraulógic: palabra encontrada (+1 punto), pista (sin coste),
      y las palabras ya encontradas persisten.
      → *R-002*
      → `frontend/e2e/journeys/paraulogic.spec.js`.
- [x] 8.4 E2E de Wordle: intentos, las tres pistas, y **segundo intento
      rechazado**.
      → *R-002*
      → `frontend/e2e/journeys/wordle.spec.js`: tres intentos, casillas comparadas
      con el `feedback` que devuelve el servidor, y `409` al volver a intentar.
- [x] 8.5 E2E de Acertijo: acierto y fallo, comprobando que los intentos previos
      no penalizan.
      → *R-002*
      → `frontend/e2e/journeys/riddle.spec.js`.

### R-003 — Persistencia

- [x] 8.6 E2E que recarga el navegador a mitad de Paraulógic y comprueba que el
      progreso sigue ahí.
      → *R-003*
      → `frontend/e2e/journeys/persistence.spec.js`: cierra el contexto entero del
      navegador y abre otro, entra otra vez con el nombre de usuario y comprueba
      que la partida sigue donde estaba y que se puede seguir jugando.

### R-004 — Chat

- [x] 8.7 E2E de envío de mensaje, recepción por polling y bloqueo.
      → *R-004*
      → `frontend/e2e/journeys/chat.spec.js`. Espera al polling de verdad (10 s);
      quien mira el chat es la única pestaña, porque el polling se para con la
      pestaña oculta (§0.1).

### R-005 y R-006 — Accesibilidad

- [x] 8.8 Auditoría axe-core de **todas** las pantallas, incluidas las de los
      tres juegos.
      → *R-005*
      → Ya existía en `e2e/accessibility.spec.js` (spec 006) y ahora corre en los
      tres perfiles de dispositivo.
- [x] 8.9 Integrar la auditoría en la suite para que una violación rompa la
      build.
      → *R-005*
      → Dentro de `npm run test:e2e`, que es parte de `test:all` y de
      `scripts/test-all.sh`.
- [x] 8.10 Comprobar reflow sin scroll horizontal en móvil y con zoom al 200%.
      → *R-006*
      → `e2e/reflow.spec.js` en los tres perfiles.

### R-007 — Teclado

- [x] 8.11 E2E que completa un flujo entero **solo con teclado**, con el foco
      visible y sin trampas.
      → *R-007*
      → `e2e/keyboard.spec.js` (spec 007) más el recorrido de Wordle con el
      teclado en pantalla, que es el flujo más largo de los tres.

### R-008 y R-009 — Verificación manual y suite

- [ ] 8.12 Recorrer y **firmar** el checklist manual de §4.1 y §4.2, con fecha.
      → *R-008*
      → El checklist está escrito en
      [`Docs/checklist-accesibilidad.md`](../../checklist-accesibilidad.md), con el
      bloque de firma vacío. **Pendiente de una persona.**
- [x] 8.13 Comando único que ejecuta toda la suite.
      → *R-009*
      → `scripts/test-all.sh`: `ruff`, `pytest`, `oxlint`, `vitest`, `playwright`
      (tres dispositivos) y `vite build`, todo dentro de los contenedores.

## Verificación de la spec

- [x] V.1 El E2E completo pasa. → `scripts/test-all.sh`, ejecutado el 2026-10-16.
- [x] V.2 Los tres juegos tienen E2E. → `paraulogic`, `wordle`, `riddle`
- [x] V.3 La puntuación coincide con la del servidor. → journey (API + pantalla),
      Paraulógic (1 punto), Wordle (80 al tercer intento), Acertijo (10 sin
      penalización)
- [x] V.4 El progreso sobrevive a la recarga. → `persistence.spec.js`
- [x] V.5 Wordle no se juega dos veces. → `wordle.spec.js`: `409` del servidor y
      formulario que no vuelve tras recargar
- [x] V.6 axe-core no reporta violaciones A ni AA. → Suite E2E, ejecutada el 2026-10-16.
- [x] V.7 Los E2E pasan en los tres dispositivos. → 291/291, desktop, tablet y mobile.
- [x] V.8 Sin scroll horizontal a 360px. → `reflow.spec.js`, perfil `mobile`
- [x] V.9 Un flujo completo se hace solo con teclado. → `keyboard.spec.js` y el
      recorrido de Wordle con teclado en pantalla
- [ ] V.10 El checklist manual está firmado. → **lo firma una persona**

## Qué se encontró implementando esto

- **El registro no abría sesión** (spec 003 · R-003). El recorrido se quedaba
  en un callejón sin salida: la pantalla de éxito decía «estás dentro» y todo lo
  demás devolvía 401. Corregido **en la spec primero** (003 · R-003) y luego en
  el backend: `register` manda la cookie con el mismo código que `login`, con
  dos tests que lo comprueban.
- **La tabla de la clasificación no se podía desplazar con teclado en móvil.**
  En 360px la caja con scroll horizontal no tenía ningún elemento enfocable:
  axe lo marcó como `scrollable-region-focusable` (WCAG 2.1.1, serio). Solo
  aparecía en el perfil `mobile`, que es justo para lo que existen los tres
  perfiles. Corregido con `role="region"`, nombre accesible y `tabIndex`.
- **Seis tests de la clasificación fallaban si alguien había jugado.** Los
  tests medían cuántas filas devuelve una base de datos en la que había partidas
  reales. Ahora vacían la clasificación al empezar cada test, dentro de la
  transacción que se deshace después.
- **Un test de la 004 filtraba un falso positivo.** Buscaba la palabra `ESTA`
  como término en el listado de juegos y la encontraba dentro de «cada letra
  **está**». La comprobación ahora distingue tildes.

## Notas

- **R-008 no es opcional ni automatizable.** axe-core comprueba lo que sabe
  medir; no comprueba si el texto de un botón se entiende. Ese juicio es humano
  y por eso queda constancia de quién lo hizo y cuándo.
- La tarea 8.9 (que la auditoría rompa la build) es la que convierte la
  accesibilidad en una restricción real y no en una intención (§0.3).
- Los recorridos leen `data/seed_v0.sql` para saber qué palabras y respuestas hay,
  porque el servidor nunca las devuelve (§2.1.2). El archivo se monta en `/data`
  dentro del contenedor del frontend, igual que en el del backend.
- Suite completa: `./scripts/test-all.sh` pasó el 2026-10-16 (299 tests backend,
  294 unitarias frontend, 291 E2E y build). oxlint tuvo 7 avisos y ningún error.
- Se cambió la imagen del frontend de Alpine a Debian slim: Chromium descargado
  por Playwright requiere glibc y no arrancaba en Alpine.
- La firma del checklist de `Docs/checklist-accesibilidad.md` requiere el
  recorrido y juicio de una persona; no se firma desde código.
