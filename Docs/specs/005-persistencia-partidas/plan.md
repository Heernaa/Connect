# Plan — Spec 005: Persistencia de partidas y puntuación

**Estado:** implementada
**Progreso:** 15/15 tareas
**Rama:** `feature/spec-005-persistencia-partidas`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 y R-002 — Guardado y restauración

- [x] 5.1 Implementar `POST /api/games/{game_id}/session` para iniciar o
      recuperar la partida.
      → *R-001*
- [x] 5.2 Guardar el estado **en cada acción relevante**, no solo al cerrar.
      → *R-001*
- [x] 5.3 Implementar la restauración: Paraulógic (encontradas y pendientes),
      Wordle (intentos y pistas), Acertijo (respondidos).
      → *R-002*
- [x] 5.4 Test: el progreso sobrevive a cerrar el navegador y volver.
      → *R-001*, *R-002*

### R-003 — Paraulógic sin límite ni derrota

- [x] 5.5 Implementar el registro de palabra encontrada, con intentos
      ilimitados y sin estado de derrota.
      → *R-003*
- [x] 5.6 Verificar que no existe ningún endpoint ni código que marque una
      partida como perdida.
      → *R-003*

### R-004 — Wordle una sola vez

- [x] 5.7 Implementar el rechazo de una segunda partida con `409`.
      → *R-004*
- [x] 5.8 Mostrar el resultado guardado cuando el jugador vuelve a entrar.
      → *R-004*
- [x] 5.9 Test: un segundo intento devuelve `409`.
      → *R-004*

### R-005 a R-008 — Puntuación

- [x] 5.10 Crear el módulo de puntuación con **la fórmula en un solo sitio**,
      parametrizada.
      → *R-005*, *R-007*, *R-008*
- [x] 5.11 Implementar Paraulógic: 1 punto por palabra, sin penalización por
      pistas ni por intentos fallidos.
      → *R-006*
- [x] 5.12 Implementar Wordle: base 100 y −10% por intento.
      → *R-007*
- [x] 5.13 Implementar Acertijo: puntos fijos, sin penalización por intentos.
      → *R-008*
- [x] 5.14 Garantizar que la puntuación **nunca se recibe del cliente**: el
      servidor la calcula siempre.
      → *R-005*

### R-009 — Anti-trampas

- [x] 5.15 Test de integración: una puntuación enviada por el cliente es
      rechazada.
      → *R-009*
- [x] 5.16 Test: una palabra inventada, fuera del conjunto, no suma puntos.
      → *R-009*
- [x] 5.17 Test: la puntuación de Paraulógic nunca supera el número de
      palabras del conjunto.
      → *R-009*

### R-010 — Puntuación acumulada

- [x] 5.18 Actualizar la puntuación por juego y la total al resolver, no al
      cerrar sesión.
      → *R-010*

## Verificación de la spec

- [x] V.1 El progreso se recupera al volver.
- [x] V.2 El progreso sobrevive a cerrar el navegador.
- [x] V.3 En Paraulógic no hay forma de perder.
- [x] V.4 Los intentos ilimitados no penalizan.
- [x] V.5 No se puede jugar a Wordle dos veces.
- [x] V.6 El segundo intento devuelve `409`.
- [x] V.7 Cada palabra de Paraulógic suma 1 punto.
- [x] V.8 Pedir pistas no altera la puntuación.
- [x] V.9 Una puntuación enviada por el cliente se rechaza.
- [x] V.10 Una palabra inventada no suma.
- [x] V.11 Wordle baja un 10% por intento.

## Notas

- La tarea 5.15 (el cliente que envía puntuación inventada) es el test más
  importante del proyecto: es la regla de oro de §5. Si ese test pasa, la
  puntuación no se puede falsear.
- La fórmula de puntuación va **en un solo módulo**. Si hay un número mágico
  repetido en dos sitios, se ha roto el requisito de "una sola fuente".
- `[WORDLE_POINTS]` y `[ACERTIJO_POINTS]` están **decididos** el 2026-10-16:
  Wordle base 100 con −10 % por intento, Acertijo 10 puntos fijos. Constan en
  §2.1.5 y §0.1 de la constitución, y en `Docs/dudas.md` §5. La tarea 5.12
  implementa la fórmula de Wordle y la 5.13 los 10 puntos fijos del acertijo,
  importando los valores desde el módulo único de puntuación.
- **Los esquemas de entrada no tienen campo de puntuación.** Ni `points` ni
  `score`. Es la forma más directa de que R-009 no dependa de que alguien se
  acuerde de ignorar el campo: no existe, así que no se puede mandar. Hay un test
  que lo comprueba sobre los tres modelos de petición.
- **Se encontró un error en la fórmula de Wordle.** La primera versión restaba el
  10 % también en el primer intento, así que acertar a la primera daba 90 en vez de
  100. La constitución dice «acierto al intento 1 = 100, al intento 6 = 50»
  (§2.1.5), así que la penalización cuenta **a partir del segundo** intento. Con
  seis intentos el suelo son 50 puntos, no 0: quien lleva la partida hasta el final
  no se queda sin nada (§1.1).
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.