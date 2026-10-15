# Spec 004 — API de contenido de los juegos

**Estado:** pendiente
**Fase:** 4a de 7
**Constitución:** §2.1.2 (contenido vía API), §2.1.4 (juegos)

## 1. Propósito

Todo el contenido de los juegos vive en PostgreSQL y llega al cliente por la
API. El cliente **pide, muestra y envía intentos**: nunca decide qué palabra es
la correcta, ni qué respuesta es la válida, ni inventa una puntuación (§2.1.2).

Esta spec define los endpoints que entregan ese contenido y, sobre todo, los
que **no** lo entregan: el diseño es deliberadamente restrictivo para que la
solución de un juego no esté disponible antes de empezar a jugar. La
validación se hace siempre en el servidor, porque el cliente puede
manipularse.

## 2. Alcance

**Incluye:**

- Endpoint de listado de juegos disponibles.
- Endpoint de contenido de Paraulógic: letras y pistas.
- Endpoint de contenido de Wordle.
- Endpoint de contenido del Acertijo.
- Normalización y comparación de respuestas en el servidor.

**Fuera de alcance:**

- Lógica de puntuación y guardado de partida (spec 005).
- Clasificación y chat (spec 007).
- Cualquier cálculo de puntos en el cliente.

## 3. Requisitos

### R-001 — Listado de juegos

- `GET /api/games` devuelve los juegos disponibles.
- Devuelve **identificador, nombre y descripción**, no contenido.
- **No devuelve** la palabra objetivo de Wordle ni la respuesta del acertijo.
- Es consultable **sin iniciar sesión** (modo espectador, §2.4).

> **Por qué:** aunque en el MVP el contenido es fijo y por tanto predecible
> (§2.1.3), enviar la solución en el listado la haría trivial de leer desde la
> pestaña de red. La API no debe facilitating ese atajo.

### R-002 — Contenido de Paraulógic

- `GET /api/games/paraulogic` devuelve las **letras** del conjunto y las
  palabras **que el jugador aún no ha encontrado**.
- **Nunca** devuelve las palabras ya encontradas ni las no encontradas como
  solución.
- Cuando el jugador ya encontró una palabra, se le muestra a él, no al servidor.
- Devuelve la lista de palabras para que el jugador sepa **cuántas le quedan**
  (es información de progreso, no solución).

### R-003 — Pistas de Paraulógic

- `GET /api/games/paraulogic/hint` devuelve **una** pista.
- La pista corresponde a una palabra que el jugador **todavía no ha
  encontrado**.
- Las palabras marcadas como poco comunes (`is_common = false`) **se priorizan**,
  porque son las que más atascan a un usuario mayor (§1.1).
- La pista **no revela la palabra**: es una ayuda, no la solución.
- **Las pistas no restan puntos** (§2.1.5). No hay que implementar ninguna
  penalización por pedirlas.

### R-004 — Contenido de Wordle

- `GET /api/games/wordle` devuelve la palabra objetivo **de 5 letras**.
- La palabra **solo** se entrega al jugador cuya partida está iniciada.
- Si el jugador ya jugó su única partida, el endpoint **no devuelve la palabra**:
  devuelve un indicador de que ya terminó (§2.1.4).

### R-005 — Contenido del Acertijo

- `GET /api/games/acertijo` devuelve el **enunciado** del acertijo.
- **Nunca** devuelve `accepted_answer`.
- La respuesta correcta permanece solo en el servidor.

### R-006 — Validación de respuestas en el servidor

- La comparación de la respuesta del acertijo se hace **en el servidor**.
- La normalización trata: mayúsculas, tildes, espacios sobrantes y signos de
  puntuación.
- Un `username` o una respuesta con tildes mal escritas se acepta si coincide
  tras normalizar: confundir una tilde es el error más frecuente a esta edad y
  no debe impedir acertar (§1.1).
- El servidor devuelve **si acertó o no**, nunca cuál era la respuesta correcta.

### R-007 — Validación de entradas en el borde

- Toda respuesta de la API tiene un modelo de validación con Pydantic (§3.2).
- Entradas inválidas devuelven `422` con un mensaje en lenguaje llano (§4.1).
- Nunca se ejecuta SQL concatenando la entrada (§6.1).

### R-008 — Pistas del frontend

> No confundir: este spec entrega las **pistas de los juegos** al frontend. Las
> **fuentes de UI** (letra, tamaño, icono) están en la spec 006 y este spec no
> las toca.

## 4. Criterios de aceptación

- [ ] `GET /api/games` funciona sin iniciar sesión.
- [ ] `GET /api/games` **no** contiene la palabra de Wordle ni la respuesta del
      acertijo.
- [ ] `GET /api/games/paraulogic` devuelve las letras y el número de palabras
      pendientes, sin las soluciones.
- [ ] Una palabra ya encontrada no aparece en la respuesta.
- [ ] La API de pistas prioriza las palabras poco comunes.
- [ ] La pista no contiene la palabra que revela.
- [ ] Pedir pistas **no** descuenta puntos.
- [ ] `GET /api/games/wordle` no devuelve la palabra si el jugador ya terminó.
- [ ] `GET /api/games/acertijo` no contiene `accepted_answer`.
- [ ] La respuesta del acertijo se acepta con tildes y mayúsculas distintas.
- [ ] `GET /api/games/wordle` **no** contiene la palabra cuando no hay sesión.

## 5. Dependencias y referencias

- **Predecesoras:** 001 (entorno), 002 (esquema), 003 (autenticación, para
  saber quién pregunta).
- **Sucesoras:** 005 (persistencia), 006 (frontend que consume la API).
- **Constitución:** §2.1.2 (contenido vía API), §2.1.4 (reglas de cada juego),
  §2.1.5 (puntuación), §6.1 (validación en el borde).