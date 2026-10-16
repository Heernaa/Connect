# Spec 002 — Esquema de datos

**Estado:** implementada
**Fase:** 2 de 7
**Constitución:** §2.1.2 (contenido vía API), §6.3 (datos mínimos)

## 1. Propósito

Toda la información de los juegos vive en PostgreSQL y se sirve por la API: el
cliente no decide nunca qué palabra es la correcta ni cuál es la respuesta
válida. Esta spec define el esquema completo de la base de datos —usuarios,
alias, contenido de los tres juegos, partidas y puntuaciones— y carga el
contenido inicial del MVP ya definido en `data/seed_v0.sql`.

El resultado es una base de datos cuyo contenido se puede comprobar
automáticamente, de forma que si alguien edita el seed y rompe algo, se entera
antes de que un usuario lo encuentre jugando.

## 2. Alcance

**Incluye:**

- Modelos SQLAlchemy para todas las entidades.
- Migraciones Alembic con el esquema completo.
- Carga del contenido del MVP desde `data/seed_v0.sql`.
- Test de integridad que verifica que el contenido cargado es el esperado.
- Script de inicialización de la base de datos en desarrollo.

**Fuera de alcance:**

- Endpoints de la API (specs 004 y 005).
- Autenticación y sesiones (spec 003), salvo la tabla de usuarios.
- Chat y clasificación (spec 007).

## 3. Requisitos

### R-001 — Modelo de usuario con alias anónimo

- Tabla `users` con `id`, `username` (único), `password_hash`, `alias`,
  `created_at`.
- `username` es único, con comparación insensible a mayúsculas.
- **`password_hash` almacena el hash, nunca la contraseña** (§6.2).
- El `alias` se genera automáticamente y **no lo elige el usuario** (§2.2).
- El `alias` es único y estable: es lo que se ve en la clasificación y el chat.
- El `alias` **no se deriva del `username`**: conocer uno no revela el otro.

### R-002 — Mínimo de datos personales

La base de datos **no almacena** (§6.3):

- Nombre real, apellidos, dirección, teléfono, ubicación.
- Foto, avatar o cualquier imagen.
- Fecha de nacimiento o edad.

Tests que verifiquen la ausencia de estas columnas.

### R-003 — Contenido de Paraulógic

- Tabla `paraulogic_sets`: `id`, `lang`, `letters`, `created_at`.
- Tabla `paraulogic_words`: `id`, `set_id`, `word`, `definition`, `is_common`.
- Tabla `paraulogic_hints`: `id`, `set_id`, `word_id`, `hint_text`, `hint_order`.
- Regla de formación: cada palabra usa **solo** letras del conjunto y ninguna
  letra más veces de las que aparece en él.
- No puede haber dos palabras iguales en el mismo conjunto.
- No puede haber una palabra que use una letra ajena al conjunto.

### R-004 — Contenido de Wordle

- Tabla `wordle_words`: `id`, `lang`, `word`, `created_at`.
- La palabra tiene exactamente 5 letras.
- No puede haber dos palabras iguales para el mismo idioma.

### R-005 — Contenido de Acertijo

- Tabla `acertijos`: `id`, `lang`, `question`, `accepted_answer`, `created_at`.
- Cada acertijo tiene **una respuesta correcta** almacenada (§2.1.4).

### R-006 — Partidas y progreso

- Tabla `game_sessions`: `id`, `user_id`, `game_id`, `status`, `started_at`,
  `updated_at`, `finished_at`.
- `game_id` identifica el tipo de juego. **Todo estado de partida lo
  incluye** (§2.1.1).
- Una partida por usuario y juego: **Wordle se juega una sola vez** (§2.1.4).
- El progreso específico de cada juego se guarda en tablas propias, ligadas a
  la partida por `session_id`.

### R-007 — Puntuación

- Tabla `scores`: `id`, `user_id`, `game_id`, `points`, `updated_at`.
- Puntuación **por usuario y por juego**, y una acumulada (§2.1.4).
- En Paraulógic: **1 punto por palabra encontrada** (§2.1.5).
- Ningún usuario puede tener dos filas para el mismo juego.
- La puntuación la calcula **siempre el servidor**, nunca el cliente (§6.4).

### R-008 — Migraciones reproducibles

- Alembic gestiona todo el esquema.
- Una migración limpia recrea la base de datos completa desde cero.
- Las migraciones son reversibles.

### R-009 — Carga del contenido del MVP

- El contenido de `data/seed_v0.sql` queda cargado en desarrollo.
- Se carga **1** palabra de Wordle, **1** acertijo y **1** set de Paraulógic con
  **21 palabras** y **21 pistas** (§2.1.8).
- La carga es **idempotente**: se puede repetir sin duplicar contenido.

### R-010 — Test de integridad del contenido

Existe un test automático que verifica que el contenido cargado es el
esperado, y **falla si no lo es**.

- Comprueba: 1 set, 21 palabras, 21 pistas, 1 palabra de Wordle, 1 acertijo.
- Comprueba que **cada palabra de Paraulógic se forma únicamente con las letras
  del conjunto**, sin repetir ninguna más de lo que aparece.
- Comprueba que la palabra de Wordle tiene 5 letras.
- Comprueba que un usuario no puede tener dos filas de puntuación para el mismo
  juego.
- Este test **verifica el contenido, no la estructura de las tablas**, y se
  escribe para que siga siendo válido si la implementación interna cambia.

## 4. Criterios de aceptación

- [x] Una migración limpia recrea el esquema completo sin errores.
- [x] `data/seed_v0.sql` se carga sin duplicados al ejecutarlo dos veces.
- [x] El test de integridad pasa.
- [x] El test de integridad **falla** si se altera el contenido del seed.
- [x] No existe ninguna columna con nombre real, email, teléfono o imagen.
- [x] `password_hash` contiene un hash argon2, no una contraseña.
- [x] Una palabra de Paraulógic con una letra ajena al conjunto es rechazada.
- [x] No se pueden crear dos usuarios con el mismo `username` variando las
      mayúsculas.

## 5. Dependencias y referencias

- **Predecesoras:** 001 (entorno local).
- **Sucesoras:** 003 (autenticación), 004 (API de contenido), 005
  (persistencia de partidas).
- **Constitución:** §2.1.1 (modelo común), §2.1.2 (contenido vía API), §2.1.5
  (puntuación), §6.2 (hash), §6.3 (datos mínimos).
- **Contenido:** `data/seed_v0.sql`.