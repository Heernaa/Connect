# Plan — Spec 002: Esquema de datos

**Estado:** implementada
**Progreso:** 16/16 tareas
**Rama:** `feature/spec-002-esquema-datos`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 — Modelo de usuario con alias anónimo

- [x] 2.1 Crear el modelo `User` con `id`, `username`, `password_hash`, `alias`,
      `created_at`.
      → *R-001*
- [x] 2.2 Implementar la generación de alias: único, a partir de una lista de
      adjetivos y animales, **independiente del `username`**.
      → *R-001*
- [x] 2.3 Garantizar que el `username` es único con comparación insensible a
      mayúsculas.
      → *R-001*

### R-002 — Mínimo de datos personales

- [x] 2.4 Escribir un test que verifique que **no existe ninguna columna** con
      nombre, email, teléfono, ubicación, foto o edad.
      → *R-002*

### R-003 — Contenido de Paraulógic

- [x] 2.5 Crear los modelos `ParaulogicSet`, `ParaulogicWord` y
      `ParaulogicHint`.
      → *R-003*
- [x] 2.6 Implementar la regla de formación: validar que cada palabra usa solo
      letras del conjunto y sin exceder las multiplicidades.
      → *R-003*
- [x] 2.7 Test: una palabra con letra ajena al conjunto se rechaza; una palabra
      repetida en el mismo conjunto se rechaza.
      → *R-003*

### R-004 y R-005 — Contenido de Wordle y Acertijo

- [x] 2.8 Crear el modelo `WordleWord` con validación de exactamente 5 letras.
      → *R-004*
- [x] 2.9 Crear el modelo `Acertijo` con `question` y `accepted_answer`.
      → *R-005*

### R-006 y R-007 — Partidas y puntuación

- [x] 2.10 Crear `GameSession` con `game_id`, `status` y marcas de tiempo.
      → *R-006*
- [x] 2.11 Crear las tablas de progreso específico por juego, ligadas a
      `session_id`.
      → *R-006*
- [x] 2.12 Crear `Score` con unicidad por (`user_id`, `game_id`).
      → *R-007*

### R-008 — Migraciones reproducibles

- [x] 2.13 Configurar Alembic con `alembic.ini` y el entorno.
      → *R-008*
- [x] 2.14 Crear la migración inicial y comprobar que `downgrade` la revierte.
      → *R-008*

### R-009 — Carga del contenido del MVP

- [x] 2.15 Adaptar la carga de `data/seed_v0.sql` al esquema definitivo y
      verificar que es idempotente.
      → *R-009*

### R-010 — Test de integridad del contenido

- [x] 2.16 Test que comprueba 1 set, 21 palabras, 21 pistas, 1 Wordle y
      1 acertijo, y que cada palabra se forma con las letras del conjunto.
      Verificar además que **falla** si se altera el seed.
      → *R-010*

## Verificación de la spec

- [x] V.1 Una migración limpia recrea el esquema sin errores.
- [x] V.2 El seed se carga dos veces sin duplicar contenido.
- [x] V.3 El test de integridad pasa.
- [x] V.4 El test de integridad falla si se altera el contenido.
- [x] V.5 No hay columnas con datos personales.
- [x] V.6 `password_hash` contiene un hash argon2. **Verificado en la spec 003**
      (`test_stored_value_is_an_argon2id_hash`) y comprobado además sobre la base
      de datos en marcha: `$argon2id$v=19$m=65536,t=3...`.
- [x] V.7 Una palabra con letra ajena se rechaza.
- [x] V.8 Dos `username` que solo difieren en mayúsculas chocan.

## Notas

- La lista de adjetivos y animales para los alias es contenido, no código. Se
  guarda en la base de datos o en un módulo propio, pero **nunca se escribe
  inline en el endpoint** (§2.1.2 aplica al contenido de juegos; aquí la regla
  es equivalente por legibilidad).
- La regla de formación de Paraulógic se implementa **en el servidor** y se
  prueba con casos límite: palabra vacía, letra repetida de más, conjunto vacío.
- El test de integridad debe seguir pasando si mañana se cambia de ORM o se
  reorganizan las tablas. Si hay que tocarlo, está mal escrito (§0.3).
- **El seed ya no crea tablas.** El esquema es de la migración y el seed solo
  inserta filas, con `ON CONFLICT DO NOTHING` para ser idempotente. Esto hizo
  falta añadir `UNIQUE` en `paraulogic_sets.letters`: sin ella, cargar el
  seed dos veces duplicaba el conjunto y sus 21 palabras.
- **El test de pistas detectó un fallo de contenido real**: la pista de
  `ESTAR` era «Aparece en "no quiero estar"», que contiene la palabra. Se
  reescribió. Ahora el test comprueba, sobre el texto de todas las pistas,
  que ninguna contiene su palabra.
- La tabla de catálogo de juegos (`id`, `nombre`, `descripción`) que necesita
  el listado de `GET /api/games` **no se crea aquí**: pertenece al requisito
  R-001 de la spec 004 y llega con ella, en su propia migración.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.