# Spec 005 — Persistencia de partidas y puntuación

**Estado:** pendiente
**Fase:** 4b de 7
**Constitución:** §2.1.5 (puntuación), §2.1.7 (partidas persistentes)

## 1. Propósito

El jugador puede **salir y volver cuando quiera** y recuperar su progreso
exacto (§2.1.7). No es una comodidad: para alguien de 70 años que cierra el
navegador para ir a tomar un café, perder media hora de deducción es motivo
suficiente para no volver a abrir la aplicación.

Esta spec define el estado de partida de los tres juegos, cómo se guarda en
PostgreSQL en cada acción relevante, y cómo se calcula la puntuación **siempre
en el servidor**. El cliente nunca dice "he acertado, dame 20 puntos": lo
solicita y el servidor comprueba si es cierto (§6.4).

## 2. Alcance

**Incluye:**

- Inicio, carga y cierre de partida.
- Guardado de progreso por juego.
- Restauración al volver a entrar.
- Cálculo de puntuación en el servidor.
- Reglas de un solo intento de Wordle y de intentos ilimitados en Paraulógic.

**Fuera de alcance:**

- Clasificación global y chat (spec 007).
- Lógica visual de los juegos (spec 006).
- Verificación del contenido (spec 004).

## 3. Requisitos

### R-001 — Estado persistido en el servidor

- El estado de la partida vive **en PostgreSQL**, nunca en memoria del proceso
  ni en el navegador (§7).
- Se guarda **en cada acción relevante**, no solo al cerrar la partida.
- Si el navegador se cierra, el dispositivo falla o el servidor se reinicia, el
  progreso **no se pierde**.

### R-002 — Restauración del progreso

Al volver a entrar, el jugador recupera:

- **Paraulógic:** las palabras ya encontradas y las que le quedan.
- **Wordle:** los intentos ya realizados y sus pistas.
- **Acertijo:** los acertijos ya respondidos.

- Nunca empieza de cero sin avisar.

### R-003 — Paraulógic: intentos ilimitados y sin perder

- **No hay límite de intentos.**
- **No existe estado de derrota.** Nunca hay opción de perder (§2.1.4).
- La partida no tiene final obligatorio: el jugador la continúa hasta
  encontrar todas las palabras o hasta que quiera parar.
- Las palabras ya encontradas quedan registradas y no se vuelven a pedir.

### R-004 — Wordle: una sola partida por jugador

- Cada jugador juega **una única vez** (§2.1.4).
- Al terminar o abandonar, **no puede volver a jugar**.
- Si vuelve a entrar, ve **su resultado**, no el juego.
- El servidor rechaza una segunda partida con `409`.

### R-005 — Puntuación calculada en el servidor

- El servidor **recibe la acción** y calcula los puntos.
- **Nunca** acepta una puntuación enviada por el cliente.
- Test de integración obligatorio: el servidor **rechaza** una puntuación
  manipulada (§5, regla de oro).

### R-006 — Fórmula de Paraulógic

- **1 punto por cada palabra encontrada** (§2.1.5).
- Pedir pistas **no resta puntos** (§2.1.5).
- Fallar un intento **no resta puntos**: los intentos son infinitos.
- Un jugador nunca baja de los puntos que ya tenía.

### R-007 — Fórmula de Wordle

- Base de **100 puntos** (`[WORDLE_POINTS]`, propuesta a confirmar).
- Penalización del **10% por cada intento usado**: 6 intentos, 0 puntos.
- Acertar en el primer intento da la puntuación máxima.
- Fórmula en un solo sitio del código, parametrizada.

### R-008 — Fórmula del Acertijo

- Puntos fijos por acertar (`[ACERTIJO_POINTS]`, propuesta a confirmar).
- **No penaliza** los intentos previos: el objetivo es pensar, no acertar a la
  primera (§2.1.4).
- Responder bien después de varios intentos vale lo mismo que a la primera.

### R-009 — Anti-trampas

- El servidor valida **toda** acción recibida (§6.6).
- Una palabra que no está en el conjunto **no suma puntos**.
- No existen puntuaciones imposibles: cada juego tiene un techo verificable
  (Paraulógic, el número de palabras del conjunto).
- Un usuario no puede subir su puntuación sin jugar.

### R-010 — Persistencia de la puntuación acumulada

- La puntuación se guarda **por usuario y por juego**.
- Se mantiene también la puntuación total acumulada para la clasificación (§2.4).
- Se actualiza al terminar cada juego o cada palabra encontrada, no solo al
  cerrar sesión.

## 4. Criterios de aceptación

- [ ] Se puede empezar una partida y recuperar el progreso al volver.
- [ ] El progreso sobrevive a cerrar el navegador.
- [ ] En Paraulógic no existe ninguna forma de perder.
- [ ] En Paraulógic se pueden hacer todos los intentos que se quiera sin
      penalización.
- [ ] Un jugador que ya jugó a Wordle no puede empezar otra partida.
- [ ] Un segundo intento de Wordle devuelve `409`.
- [ ] Cada palabra encontrada en Paraulógic suma exactamente 1 punto.
- [ ] Pedir pistas no altera la puntuación.
- [ ] El cliente que envía una puntuación inventada es rechazado.
- [ ] Una palabra inventada no suma puntos.
- [ ] La puntuación de Wordle baja un 10% por cada intento.

## 5. Dependencias y referencias

- **Predecesoras:** 002 (esquema), 004 (contenido).
- **Sucesoras:** 006 (frontend que consume el estado), 007 (clasificación).
- **Constitución:** §2.1.4 (reglas de juego), §2.1.5 (puntuación), §2.1.7
  (persistencia), §5 (regla de oro de puntuación), §6.6 (anti-trampas).