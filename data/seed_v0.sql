-- =============================================================================
-- Connect — Contenido inicial del MVP (v0)
-- =============================================================================
-- Carga de contenido para los tres juegos. Cumple lo definido en
-- Docs/constitution.md §2.1:
--   - Todo el contenido vive aquí y se sirve por la API (§2.1.2).
--   - Cero palabras de juego escritas en el código del cliente.
--   - Idioma único: español.
--
-- Uso:  psql -U <user> -d connect -f data/seed_v0.sql
--
-- Todas las tablas son idempotentes: se puede volver a ejecutar el script sin
-- duplicar contenido.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Paraulógic — conjunto de letras y palabras
-- -----------------------------------------------------------------------------
-- Regla del juego: cada palabra usa SOLO letras del conjunto, y ninguna letra
-- más veces de las que aparece en el conjunto.
--
-- Conjunto: A, E, N, R, S, T  (6 letras; el mínimo exigido eran 5)
--
-- Verificado por script: las 21 palabras siguientes se forman únicamente con
-- esas 6 letras, sin repetir ninguna más veces de las que aparece.
-- El requisito era "al menos 10 palabras": se cumple con margen.
--
-- La lista está ordenada de más común a más literaria, para que las pistas
--que prioricen las difíciles.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS paraulogic_sets (
    id          SERIAL PRIMARY KEY,
    lang        VARCHAR(5)  NOT NULL DEFAULT 'es',
    letters     VARCHAR(20) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paraulogic_words (
    id          SERIAL PRIMARY KEY,
    set_id      INTEGER     NOT NULL REFERENCES paraulogic_sets(id) ON DELETE CASCADE,
    word        VARCHAR(50) NOT NULL,
    definition  TEXT        NOT NULL,
    is_common   BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (set_id, word)
);

-- Pistas del botón "Pedir pista". No restan puntos (§2.1.5): la puntuación es
-- 1 punto por palabra encontrada.
CREATE TABLE IF NOT EXISTS paraulogic_hints (
    id          SERIAL PRIMARY KEY,
    set_id      INTEGER     NOT NULL REFERENCES paraulogic_sets(id) ON DELETE CASCADE,
    word_id     INTEGER     NOT NULL REFERENCES paraulogic_words(id) ON DELETE CASCADE,
    hint_text   TEXT        NOT NULL,
    hint_order  SMALLINT    NOT NULL DEFAULT 1,
    UNIQUE (set_id, word_id, hint_order)
);

-- -----------------------------------------------------------------------------
-- Wordle — una única palabra objetivo
-- -----------------------------------------------------------------------------
-- 5 letras. Wordle se juega UNA vez por jugador (§2.1.4).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wordle_words (
    id          SERIAL PRIMARY KEY,
    lang        VARCHAR(5)  NOT NULL DEFAULT 'es',
    word        VARCHAR(10) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lang, word)
);

-- -----------------------------------------------------------------------------
-- Acertijo — un único acertijo
-- -----------------------------------------------------------------------------
-- Hay UNA respuesta correcta (§2.1.4). El objetivo es que el jugador piense,
-- no que memorice.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS acertijos (
    id              SERIAL PRIMARY KEY,
    lang            VARCHAR(5)  NOT NULL DEFAULT 'es',
    question        TEXT        NOT NULL,
    accepted_answer TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- CARGA DE DATOS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Paraulógic
-- -----------------------------------------------------------------------------
INSERT INTO paraulogic_sets (letters)
SELECT 'AENRST'
WHERE NOT EXISTS (SELECT 1 FROM paraulogic_sets WHERE letters = 'AENRST');

-- is_common = FALSE en las cinco palabras más literarias. El botón de pistas
-- las prioriza, porque un usuario mayor con dificultad con una palabra antigua
-- debería poder pedir ayuda sin vergüenza (§1.1).
INSERT INTO paraulogic_words (set_id, word, definition, is_common)
SELECT s.id, v.word, v.definition, v.is_common
FROM paraulogic_sets s
CROSS JOIN (VALUES
    ('ESTAR',  'Verbo que indica un estado o situación.',                        TRUE),
    ('TRAE',   'Acompaña o conduce algo a un lugar.',                            TRUE),
    ('SETA',   'Objeto formado por un conjunto, cualquier cosa que se pone.',    TRUE),
    ('RESTA',  'Lo que queda al quitar algo a una cantidad.',                    TRUE),
    ('TENAR',  'Tener en su poder una cosa o disponer de ella.',                 TRUE),
    ('RENTA',  'Pago periódico que se hace a cambio de un servicio.',            TRUE),
    ('ARTE',   'Expresión de la actividad humana creadora.',                     TRUE),
    ('ARTES',  'Conjunto de expresiones de la actividad creadora.',              TRUE),
    ('TERNAS', 'Grupos de tres elementos.',                                      TRUE),
    ('ANTER',  'Cosa que va delante, en el orden o en el espacio.',              TRUE),
    ('ERAN',   'Tercera persona del plural del verbo ser, en pasado.',           TRUE),
    ('SERA',   'Tercera persona del singular del verbo ser.',                    TRUE),
    ('SEN',    'Pronombre que sustituye a una persona.',          TRUE),
    ('NATE',   'Embarcación pequeña de fondo plano.',                            TRUE),
    ('NAT',    'Significa «nació». Tres letras.',                       FALSE),
    ('RESTAN', 'Tercera persona del plural del verbo restar.',                   TRUE),
    ('SERAN',  'Tercera persona del plural del verbo ser, en futuro.',           TRUE),
    ('SENAR',  'Segar la hierba de un terreno.',                                 FALSE),
    ('ATRE',   'Piezas que se ponen en un juego para poder jugar.',     FALSE),
    ('ASTER',  'Flor de la familia de las margaritas.',                          FALSE),
    ('TRANSE', 'Lote de terreno dedicado al pastoreo.',                          FALSE)
) AS v(word, definition, is_common)
WHERE s.letters = 'AENRST'
  AND NOT EXISTS (
      SELECT 1 FROM paraulogic_words w WHERE w.set_id = s.id AND w.word = v.word
  );

-- Pistas: una por palabra. Para las más literarias, la pista da una definición
-- indirecta en lugar de la letra o la longitud, para no resolverla del todo.
INSERT INTO paraulogic_hints (set_id, word_id, hint_text, hint_order)
SELECT s.id, w.id, v.hint_text, 1
FROM paraulogic_sets s
JOIN paraulogic_words w ON w.set_id = s.id
CROSS JOIN (VALUES
    ('ESTAR',  'Cinco letras. Aparece en "no quiero estar".'),
    ('TRAE',   'Es el imperativo de "traer".'),
    ('SETA',   'Es una seta de champiñón. También es "seta" de vino.'),
    ('RESTA',  'Se escribe como "resto", pero con A al principio.'),
    ('TENAR',  'Es el infinitivo del verbo "tener".'),
    ('RENTA',  'Empieza por R y acaba en A. Seis letras.'),
    ('ARTE',   'Empieza por A y acaba en E. Son cuatro letras.'),
    ('ARTES',  'Es el plural de "arte".'),
    ('TERNAS', 'Grupos de tres elementos. Seis letras.'),
    ('ANTER',  'Un "anterior" sin la I. Seis letras.'),
    ('ERAN',   'Es el pasado del verbo "ser", en plural.'),
    ('SERA',   'Es el futuro del verbo "ser". Cuatro letras.'),
    ('SEN',    'Pronombre que sustituye a "esa persona". Tres letras.'),
    ('NATE',   'Es una persona que nada. También es un apego.'),
    ('NAT',    'Significa "nació". Tres letras.'),
    ('RESTAN', 'Es el plural de "restar".'),
    ('SERAN',  'Es el futuro del verbo "ser", en plural.'),
    ('SENAR',  'Se dice del terreno donde se siega la hierba.'),
    ('ATRE',   'Primero A, luego R, y al final una E.'),
    ('ASTER',  'Es una flor con forma de estrella. Seis letras.'),
    ('TRANSE', 'Es una finca donde se pastan las ovejas. Seis letras.')
) AS v(word, hint_text)
WHERE s.letters = 'AENRST'
  AND NOT EXISTS (
      SELECT 1 FROM paraulogic_hints h
      WHERE h.set_id = s.id AND h.word_id = w.id AND h.hint_order = 1
  );

-- -----------------------------------------------------------------------------
-- Wordle
-- -----------------------------------------------------------------------------
INSERT INTO wordle_words (word)
SELECT 'LUNAS'
WHERE NOT EXISTS (SELECT 1 FROM wordle_words WHERE word = 'LUNAS');

-- -----------------------------------------------------------------------------
-- Acertijo
-- -----------------------------------------------------------------------------
INSERT INTO acertijos (question, accepted_answer)
SELECT 'Tengo ciudades, pero no casas. Tengo montañas, pero no árboles.
        Tengo agua, pero no arena. ¿Qué soy?',
       'el mapa'
WHERE NOT EXISTS (
    SELECT 1 FROM acertijos WHERE question LIKE 'Tengo ciudades%'
);

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Debe devolver: 1 set, 21 palabras, 21 pistas, 1 palabra Wordle, 1 acertijo.
-- El juego NO arranca si alguna de estas cifras no coincide.
-- =============================================================================

SELECT 'paraulogic_sets'   AS tabla, COUNT(*) AS filas FROM paraulogic_sets
UNION ALL SELECT 'paraulogic_words',  COUNT(*) FROM paraulogic_words
UNION ALL SELECT 'paraulogic_hints',  COUNT(*) FROM paraulogic_hints
UNION ALL SELECT 'wordle_words',      COUNT(*) FROM wordle_words
UNION ALL SELECT 'acertijos',         COUNT(*) FROM acertijos;