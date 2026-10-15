# Plan — Spec 008: E2E y verificación de accesibilidad

**Estado:** planificada — **no implementada**
**Progreso:** 0/12 tareas
**Rama:** `feature/spec-008-e2e-y-accesibilidad`
**Spec:** [`spec.md`](./spec.md)

> ⛔ **La implementación de esta spec no está autorizada.**

## Tareas

### R-001 y R-002 — Recorridos E2E de los juegos

- [ ] 8.1 Configurar Playwright con los tres perfiles de dispositivo
      (ordenador, tablet, móvil).
      → *R-006*
- [ ] 8.2 E2E del flujo completo: registro → login → jugar → clasificación.
      → *R-001*
- [ ] 8.3 E2E de Paraulógic: palabra encontrada (+1 punto), pista (sin coste),
      y las palabras ya encontradas persisten.
      → *R-002*
- [ ] 8.4 E2E de Wordle: intentos, las tres pistas, y **segundo intento
      rechazado**.
      → *R-002*
- [ ] 8.5 E2E de Acertijo: acierto y fallo, comprobando que los intentos previos
      no penalizan.
      → *R-002*

### R-003 — Persistencia

- [ ] 8.6 E2E que recarga el navegador a mitad de Paraulógic y comprueba que el
      progreso sigue ahí.
      → *R-003*

### R-004 — Chat

- [ ] 8.7 E2E de envío de mensaje, recepción por polling y bloqueo.
      → *R-004*

### R-005 y R-006 — Accesibilidad

- [ ] 8.8 Auditoría axe-core de **todas** las pantallas, incluidas las de los
      tres juegos.
      → *R-005*
- [ ] 8.9 Integrar la auditoría en la suite para que una violación rompa la
      build.
      → *R-005*
- [ ] 8.10 Comprobar reflow sin scroll horizontal en móvil y con zoom al 200%.
      → *R-006*

### R-007 — Teclado

- [ ] 8.11 E2E que completa un flujo entero **solo con teclado**, con el foco
      visible y sin trampas.
      → *R-007*

### R-008 y R-009 — Verificación manual y suite

- [ ] 8.12 Recorrer y **firmar** el checklist manual de §4.1 y §4.2, con fecha.
      → *R-008*
- [ ] 8.13 Comando único que ejecuta toda la suite.
      → *R-009*

## Verificación de la spec

- [ ] V.1 El E2E completo pasa.
- [ ] V.2 Los tres juegos tienen E2E.
- [ ] V.3 La puntuación coincide con la del servidor.
- [ ] V.4 El progreso sobrevive a la recarga.
- [ ] V.5 Wordle no se juega dos veces.
- [ ] V.6 axe-core no reporta violaciones A ni AA.
- [ ] V.7 Los E2E pasan en los tres dispositivos.
- [ ] V.8 Sin scroll horizontal a 360px.
- [ ] V.9 Un flujo completo se hace solo con teclado.
- [ ] V.10 El checklist manual está firmado.

## Notas

- **R-008 no es opcional ni automatizable.** axe-core comprueba lo que sabe
  medir; no comprueba si el texto de un botón se entiende. Ese juicio es humano
  y por eso queda constancia de quién lo hizo y cuándo.
- La tarea 8.9 (que la auditoría rompa la build) es la que convierte la
  accesibilidad en una restricción real y no en una intención (§0.3).
- Esta spec necesita las 007 para los E2E de chat y clasificación. Si la 007 no
  se implementa, se ajusta el alcance de aquí.
- Al terminar, la spec cierra el MVP: actualizar `Docs/dudas.md` y la deuda
  técnica de la constitución (§11) con lo que quede pendiente.