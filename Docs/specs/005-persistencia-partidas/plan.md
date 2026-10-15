# Plan — Spec 005: Persistencia de partidas y puntuación

**Estado:** pendiente
**Progreso:** 0/15 tareas
**Rama:** `feature/spec-005-persistencia-partidas`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 y R-002 — Guardado y restauración

- [ ] 5.1 Implementar `POST /api/games/{game_id}/session` para iniciar o
      recuperar la partida.
      → *R-001*
- [ ] 5.2 Guardar el estado **en cada acción relevante**, no solo al cerrar.
      → *R-001*
- [ ] 5.3 Implementar la restauración: Paraulógic (encontradas y pendientes),
      Wordle (intentos y pistas), Acertijo (respondidos).
      → *R-002*
- [ ] 5.4 Test: el progreso sobrevive a cerrar el navegador y volver.
      → *R-001*, *R-002*

### R-003 — Paraulógic sin límite ni derrota

- [ ] 5.5 Implementar el registro de palabra encontrada, con intentos
      ilimitados y sin estado de derrota.
      → *R-003*
- [ ] 5.6 Verificar que no existe ningún endpoint ni código que marque una
      partida como perdida.
      → *R-003*

### R-004 — Wordle una sola vez

- [ ] 5.7 Implementar el rechazo de una segunda partida con `409`.
      → *R-004*
- [ ] 5.8 Mostrar el resultado guardado cuando el jugador vuelve a entrar.
      → *R-004*
- [ ] 5.9 Test: un segundo intento devuelve `409`.
      → *R-004*

### R-005 a R-008 — Puntuación

- [ ] 5.10 Crear el módulo de puntuación con **la fórmula en un solo sitio**,
      parametrizada.
      → *R-005*, *R-007*, *R-008*
- [ ] 5.11 Implementar Paraulógic: 1 punto por palabra, sin penalización por
      pistas ni por intentos fallidos.
      → *R-006*
- [ ] 5.12 Implementar Wordle: base 100 y −10% por intento.
      → *R-007*
- [ ] 5.13 Implementar Acertijo: puntos fijos, sin penalización por intentos.
      → *R-008*
- [ ] 5.14 Garantizar que la puntuación **nunca se recibe del cliente**: el
      servidor la calcula siempre.
      → *R-005*

### R-009 — Anti-trampas

- [ ] 5.15 Test de integración: una puntuación enviada por el cliente es
      rechazada.
      → *R-009*
- [ ] 5.16 Test: una palabra inventada, fuera del conjunto, no suma puntos.
      → *R-009*
- [ ] 5.17 Test: la puntuación de Paraulógic nunca supera el número de
      palabras del conjunto.
      → *R-009*

### R-010 — Puntuación acumulada

- [ ] 5.18 Actualizar la puntuación por juego y la total al resolver, no al
      cerrar sesión.
      → *R-010*

## Verificación de la spec

- [ ] V.1 El progreso se recupera al volver.
- [ ] V.2 El progreso sobrevive a cerrar el navegador.
- [ ] V.3 En Paraulógic no hay forma de perder.
- [ ] V.4 Los intentos ilimitados no penalizan.
- [ ] V.5 No se puede jugar a Wordle dos veces.
- [ ] V.6 El segundo intento devuelve `409`.
- [ ] V.7 Cada palabra de Paraulógic suma 1 punto.
- [ ] V.8 Pedir pistas no altera la puntuación.
- [ ] V.9 Una puntuación enviada por el cliente se rechaza.
- [ ] V.10 Una palabra inventada no suma.
- [ ] V.11 Wordle baja un 10% por intento.

## Notas

- La tarea 5.15 (el cliente que envía puntuación inventada) es el test más
  importante del proyecto: es la regla de oro de §5. Si ese test pasa, la
  puntuación no se puede falsear.
- La fórmula de puntuación va **en un solo módulo**. Si hay un número mágico
  repetido en dos sitios, se ha roto el requisito de "una sola fuente".
- `[WORDLE_POINTS]` y `[ACERTIJO_POINTS]` son valores propuestos, no
  confirmados. Están marcados como tales en la constitución (§0.2) y hay que
  decidir antes de implementar 5.12 y 5.13.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.