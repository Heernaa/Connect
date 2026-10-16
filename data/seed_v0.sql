-- =============================================================================
-- Connect — Contenido inicial del MVP (v0)
-- =============================================================================
-- Carga de CONTENIDO. El esquema lo crea Alembic (`alembic upgrade head`); este
-- script solo inserta filas. Las tablas se crean antes con la migración, así que
-- aquí no hay ni un CREATE TABLE: el esquema tiene una única fuente de verdad.
--
-- Cumple lo definido en Docs/constitution.md §2.1:
--   - Todo el contenido vive aquí y se sirve por la API (§2.1.2).
--   - Cero palabras de juego escritas en el código del cliente.
--   - Idioma único: español.
--   - Un único set por juego, fijo, sin rotación diaria (§2.1.3).
--
-- Uso:  psql "$DATABASE_URL" -f data/seed_v0.sql
--
-- Es IDEMPOTENTE: se puede ejecutar tantas veces como haga falta sin duplicar
-- nada. Todas las inserciones se apoyan en `ON CONFLICT DO NOTHING`, así que el
-- script también es seguro si el contenido ya está cargado.
--
-- Para ejecutarlo contra el contenedor de desarrollo:
--   docker compose exec -T db psql -U connect -d connect < data/seed_v0.sql
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Catálogo de juegos
-- -----------------------------------------------------------------------------
-- Nombre y descripción de cada juego. También es contenido: la API lo sirve y el
-- cliente no lo escribe (§2.1.2). `sort_order` fija el orden en que se muestran.
--
-- Las descripciones NO revelan nada de la solución: describen en qué consiste el
-- juego, no qué hay que responder.
-- -----------------------------------------------------------------------------

INSERT INTO games (game_id, name, description, sort_order)
VALUES
    ('paraulogic', 'Paraulógic',
     'Un conjunto de letras forma varias palabras. Hay que encontrarlas todas, sin límite de intentos y sin poder perder.',
     1),
    ('wordle', 'Wordle',
     'Adivina una palabra de cinco letras en seis intentos. Después de cada intento sabes si cada letra está, y en qué sitio.',
     2),
    ('riddle', 'Acertijo',
     'Una pregunta con una única respuesta correcta. Se puntúa acertar, no la rapidez: puedes pensarlo tanto tiempo como quieras.',
     3)
ON CONFLICT (game_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Paraulógic — conjunto de letras y palabras
-- -----------------------------------------------------------------------------
-- Regla del juego: cada palabra usa SOLO letras del conjunto, y ninguna letra
-- más veces de las que aparece en el conjunto.
--
-- Conjunto: A, E, N, R, S, T  (6 letras; el mínimo exigido eran 5)
--
-- Verificado por script, no a ojo: el test de integridad de la spec 002 falla
-- si alguna de las 21 palabras incumple la regla. El requisito era "al menos 10
-- palabras": se cumple con margen.
--
-- La lista va de más común a más literaria, para que las pistas prioricen las
-- difíciles.
-- -----------------------------------------------------------------------------

INSERT INTO paraulogic_sets (letters, lang)
VALUES ('AENRST', 'es')
ON CONFLICT DO NOTHING;

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
    ('SEN',    'Pronombre que sustituye a una persona.',                         TRUE),
    ('NATE',   'Embarcación pequeña de fondo plano.',                            TRUE),
    ('NAT',    'Significa «nació». Tres letras.',                                 FALSE),
    ('RESTAN', 'Tercera persona del plural del verbo restar.',                   TRUE),
    ('SERAN',  'Tercera persona del plural del verbo ser, en futuro.',           TRUE),
    ('SENAR',  'Segar la hierba de un terreno.',                                 FALSE),
    ('ATRE',   'Piezas que se ponen en un juego para poder jugar.',              FALSE),
    ('ASTER',  'Flor de la familia de las margaritas.',                          FALSE),
    ('TRANSE', 'Lote de terreno dedicado al pastoreo.',                          FALSE)
) AS v(word, definition, is_common)
WHERE s.letters = 'AENRST'
ON CONFLICT (set_id, word) DO NOTHING;

-- Pistas: una por palabra. Para las más literarias la pista da una definición
-- indirecta en lugar de la letra o la longitud, para no resolverla del todo.
--
-- El texto de una pista NUNCA contiene la palabra: pedir ayuda no puede regalar
-- la solución (spec 004 · R-003). Tampoco vale casi contenerla: «el imperativo de
-- "traer"» ya te dice que la palabra es TRAE, así que la pista tiene que describir
-- lo que significa sin escribirla.
-- La tabla de pistas va primera en el FROM y las palabras se unen por su texto.
-- Si el orden fuera el contrario, cada palabra se emparejaría con la primera
-- pista de la lista y todas acabarían con la misma ayuda.
INSERT INTO paraulogic_hints (set_id, word_id, hint_text, hint_order)
SELECT s.id, w.id, v.hint_text, 1
FROM (VALUES
    ('ESTAR',  'Cinco letras. Es el verbo de "me siento bien aquí".'),
    ('TRAE',   'Cinco letras. Es el imperativo de un verbo de movimiento.'),
    ('SETA',   'Cinco letras. Es un hongo comestible que se puede comer frita.'),
    ('RESTA',  'Se escribe como "resto", pero con A al principio.'),
    ('TENAR',  'Es el infinitivo del verbo "tener".'),
    ('RENTA',  'Empieza por R y acaba en A. Seis letras.'),
    ('ARTE',   'Empieza por A y acaba en E. Son cuatro letras.'),
    ('ARTES',  'Es el plural de "arte".'),
    ('TERNAS', 'Grupos de tres elementos. Seis letras.'),
    ('ANTER',  'Seis letras. Va delante en el orden o en el espacio.'),
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
JOIN paraulogic_sets s ON s.letters = 'AENRST'
JOIN paraulogic_words w ON w.set_id = s.id AND w.word = v.word
ON CONFLICT (set_id, word_id, hint_order) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Wordle — una única palabra objetivo
-- -----------------------------------------------------------------------------
-- 5 letras en mayúsculas. La base de datos lo comprueba con un CHECK, así que
-- una palabra que no cumpla no puede entrar ni por error (§2.1.4).
-- Wordle se juega UNA vez por jugador.
-- -----------------------------------------------------------------------------

INSERT INTO wordle_words (word, lang)
VALUES ('LUNAS', 'es')
ON CONFLICT (lang, word) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Acertijo — un único acertijo
-- -----------------------------------------------------------------------------
-- Hay UNA respuesta correcta. El objetivo es que el jugador piense, no que
-- memorice, y `accepted_answer` nunca sale hacia el cliente: lo decide el
-- servidor (§2.1.2).
-- -----------------------------------------------------------------------------

INSERT INTO riddles (question, accepted_answer, lang)
SELECT 'Tengo ciudades, pero no casas. Tengo montañas, pero no árboles.
        Tengo agua, pero no arena. ¿Qué soy?',
       'el mapa',
       'es'
WHERE NOT EXISTS (SELECT 1 FROM riddles WHERE question LIKE 'Tengo ciudades%');

COMMIT;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Debe devolver: 3 juegos, 1 set, 21 palabras, 21 pistas, 1 palabra de Wordle
-- y 1 acertijo. El test de integridad de la spec 002 falla si alguna cifra no
-- coincide, así que esta consulta es solo para revisarla a ojo.
-- =============================================================================

SELECT 'games'              AS tabla, COUNT(*) AS filas FROM games
UNION ALL SELECT 'paraulogic_sets'   AS tabla, COUNT(*) AS filas FROM paraulogic_sets
UNION ALL SELECT 'paraulogic_words',  COUNT(*) FROM paraulogic_words
UNION ALL SELECT 'paraulogic_hints',  COUNT(*) FROM paraulogic_hints
UNION ALL SELECT 'wordle_words',      COUNT(*) FROM wordle_words
UNION ALL SELECT 'riddles',           COUNT(*) FROM riddles;