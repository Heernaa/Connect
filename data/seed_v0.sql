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
-- si alguna palabra incumple la regla de las letras, si alguna se repite, si
-- alguna se queda sin pista o si una pista revela su propia palabra.
-- -----------------------------------------------------------------------------

INSERT INTO paraulogic_sets (letters, lang)
VALUES ('AENRST', 'es')
ON CONFLICT DO NOTHING;

-- Respuestas revisadas del conjunto, de más larga a más corta.
--
-- Se aceptan entradas del DLE y formas verbales correctas. Se excluyen nombres
-- propios, siglas, falsos amigos y formas inventadas. Esta es una selección
-- revisada, no una afirmación de que se hayan agotado todas las combinaciones.
--
-- Las formas que llevan tilde se guardan sin ella porque el juego solo tiene las
-- letras A, E, N, R, S, T; la validación normaliza las tildes.
-- El conjunto suma 57 respuestas: 6 de seis letras, 18 de cinco, 22 de cuatro
-- y 11 de tres. Todas usan solo letras disponibles, sin repetirlas.
--
-- Las entradas menos frecuentes (subjuntivos, botánica o vocabulario
-- especializado) llevan is_common = FALSE para que se prioricen al ofrecer
-- pistas (§1.1).

INSERT INTO paraulogic_words (set_id, word, definition, is_common)
SELECT s.id, v.word, v.definition, v.is_common
FROM paraulogic_sets s
CROSS JOIN (VALUES
    ('ENTRAS', 'Forma verbal que indica pasar de fuera hacia dentro, dirigida a una persona.', TRUE),
    ('RENTAS', 'Ingresos periódicos recibidos o pagos periódicos por el uso de un bien.', TRUE),
    ('RESTAN', 'Forma verbal que expresa la cantidad que queda al quitar algo.', TRUE),
    ('SENTAR', 'Verbo que significa colocar a alguien en una silla o tomar asiento.', TRUE),
    ('TENSAR', 'Verbo que significa poner tirante una cuerda o un músculo.', TRUE),
    ('TERNAS', 'Plural de un grupo compuesto por tres elementos.', TRUE),
    ('ANTES', 'Adverbio que indica que algo ocurre con anterioridad.', TRUE),
    ('ARNES', 'Conjunto de correas que sujeta o asegura a una persona o animal.', TRUE),
    ('ARTES', 'Plural de una actividad creativa, técnica o manual.', TRUE),
    ('ASTER', 'Género de plantas vivaces de la familia de las compuestas.', FALSE),
    ('ESTAN', 'Forma verbal que indica dónde se encuentran varias personas o cosas.', TRUE),
    ('ESTAR', 'Verbo que indica una situación, ubicación o estado temporal.', TRUE),
    ('ENTRA', 'Forma verbal que indica pasar de fuera hacia dentro.', TRUE),
    ('NETAS', 'Plural femenino de un adjetivo que indica que no hay descuentos.', TRUE),
    ('RASEN', 'Forma verbal de alisar o nivelar una superficie.', FALSE),
    ('RENTA', 'Ingreso periódico o pago por el uso de un bien.', TRUE),
    ('RESTA', 'Resultado de quitar una cantidad a otra; también, una operación aritmética.', TRUE),
    ('SERAN', 'Forma futura de un verbo copulativo para varias personas.', TRUE),
    ('SERNA', 'Porción de tierra destinada a la siembra.', FALSE),
    ('TENAS', 'Plural de una palabra que nombra útiles de un arte de pesca.', FALSE),
    ('TENSA', 'Adjetivo femenino que describe algo tirante o rígido.', TRUE),
    ('TERNA', 'Grupo de tres personas o cosas que optan a algo.', TRUE),
    ('TRAEN', 'Forma verbal que indica llevar algo hacia aquí, con sujeto plural.', TRUE),
    ('TRAES', 'Forma verbal que indica llevar algo hacia aquí, dirigida a quien escucha.', TRUE),
    ('AREN', 'Subjuntivo plural de arar, referido a varias personas.', FALSE),
    ('ARES', 'Subjuntivo de arar dirigido a quien escucha.', FALSE),
    ('ANTE', 'Preposición que significa «frente a» o «en presencia de».', TRUE),
    ('ARTE', 'Actividad humana que crea obras estéticas o expresivas.', TRUE),
    ('ASEN', 'Subjuntivo plural de asar, referido a varias personas.', TRUE),
    ('ATEN', 'Subjuntivo plural de atar, referido a varias personas.', TRUE),
    ('ATES', 'Subjuntivo de atar dirigido a quien escucha.', TRUE),
    ('ERAN', 'Forma de pasado de un verbo copulativo para varias personas.', TRUE),
    ('ERAS', 'Forma de pasado de un verbo copulativo para una persona.', TRUE),
    ('ESTA', 'Determinante demostrativo femenino que señala algo cercano.', TRUE),
    ('NETA', 'Adjetivo femenino que indica que una cantidad queda limpia de descuentos.', TRUE),
    ('RETA', 'Forma verbal que significa desafiar a alguien.', TRUE),
    ('SEAN', 'Forma plural de subjuntivo de un verbo que expresa identidad o existencia.', TRUE),
    ('SERA', 'Bolsa grande tejida con esparto.', FALSE),
    ('SETA', 'Hongo con sombrero y pie; algunas especies son comestibles.', TRUE),
    ('SEN', 'Arbusto oriental cuyas hojas se emplean en infusión.', FALSE),
    ('TENA', 'Conjunto de útiles empleados en una modalidad de pesca.', FALSE),
    ('SENA', 'Otro nombre de un arbusto cuyas hojas se emplean en infusión.', FALSE),
    ('TASE', 'Forma de subjuntivo del verbo que consiste en fijar el precio de algo.', FALSE),
    ('TREN', 'Vehículo formado por vagones que circulan por raíles.', TRUE),
    ('TRES', 'Número que sigue al dos.', TRUE),
    ('TRAE', 'Forma verbal que indica llevar algo hacia quien habla.', TRUE),
    ('TRAS', 'Preposición que indica posterioridad o posición detrás de algo.', TRUE),
    ('ARE', 'Forma de subjuntivo del verbo que consiste en abrir surcos en la tierra.', FALSE),
    ('ASE', 'Forma singular de presente de subjuntivo de asar.', FALSE),
    ('ERA', 'Época o etapa histórica; también forma de pasado verbal.', TRUE),
    ('ESA', 'Determinante demostrativo femenino que señala algo alejado.', TRUE),
    ('RES', 'Cabeza de ganado vacuno.', TRUE),
    ('SEA', 'Forma verbal de subjuntivo usada para expresar deseo o posibilidad.', TRUE),
    ('SER', 'Verbo copulativo que expresa identidad, naturaleza o existencia.', TRUE),
    ('TAN', 'Adverbio que expresa intensidad o grado.', TRUE),
    ('TEA', 'Astilla resinosa que se enciende para alumbrar.', FALSE),
    ('TEN', 'Mandato dirigido a una persona para que posea o conserve algo.', TRUE)
) AS v(word, definition, is_common)
WHERE s.letters = 'AENRST'
ON CONFLICT (set_id, word) DO UPDATE
SET definition = EXCLUDED.definition,
    is_common = EXCLUDED.is_common;

INSERT INTO paraulogic_hints (set_id, word_id, hint_text, hint_order)
SELECT s.id, w.id, v.hint_text, 1
FROM (VALUES
    ('ENTRAS', 'Forma verbal que indica pasar de fuera hacia dentro, dirigida a una persona.'),
    ('RENTAS', 'Ingresos periódicos recibidos o pagos periódicos por el uso de un bien.'),
    ('RESTAN', 'Forma verbal que expresa la cantidad que queda al quitar algo.'),
    ('SENTAR', 'Verbo que significa colocar a alguien en una silla o tomar asiento.'),
    ('TENSAR', 'Verbo que significa poner tirante una cuerda o un músculo.'),
    ('TERNAS', 'Plural de un grupo compuesto por tres elementos.'),
    ('ANTES', 'Adverbio que indica que algo ocurre con anterioridad.'),
    ('ARNES', 'Conjunto de correas que sujeta o asegura a una persona o animal.'),
    ('ARTES', 'Plural de una actividad creativa, técnica o manual.'),
    ('ASTER', 'Género de plantas vivaces de la familia de las compuestas.'),
    ('ESTAN', 'Forma verbal que indica dónde se encuentran varias personas o cosas.'),
    ('ESTAR', 'Verbo que indica una situación, ubicación o estado temporal.'),
    ('ENTRA', 'Forma verbal que indica pasar de fuera hacia dentro.'),
    ('NETAS', 'Plural femenino de un adjetivo que indica que no hay descuentos.'),
    ('RASEN', 'Forma verbal de alisar o nivelar una superficie.'),
    ('RENTA', 'Ingreso periódico o pago por el uso de un bien.'),
    ('RESTA', 'Resultado de quitar una cantidad a otra; también, una operación aritmética.'),
    ('SERAN', 'Forma futura de un verbo copulativo para varias personas.'),
    ('SERNA', 'Porción de tierra destinada a la siembra.'),
    ('TENAS', 'Plural de una palabra que nombra útiles de un arte de pesca.'),
    ('TENSA', 'Adjetivo femenino que describe algo tirante o rígido.'),
    ('TERNA', 'Grupo de tres personas o cosas que optan a algo.'),
    ('TRAEN', 'Forma verbal que indica llevar algo hacia aquí, con sujeto plural.'),
    ('TRAES', 'Forma verbal que indica llevar algo hacia aquí, dirigida a quien escucha.'),
    ('AREN', 'Subjuntivo plural de arar, referido a varias personas.'),
    ('ARES', 'Subjuntivo de arar dirigido a quien escucha.'),
    ('ANTE', 'Preposición que significa «frente a» o «en presencia de».'),
    ('ARTE', 'Actividad humana que crea obras estéticas o expresivas.'),
    ('ASEN', 'Subjuntivo plural de asar, referido a varias personas.'),
    ('ATEN', 'Subjuntivo plural de atar, referido a varias personas.'),
    ('ATES', 'Subjuntivo de atar dirigido a quien escucha.'),
    ('ERAN', 'Forma de pasado de un verbo copulativo para varias personas.'),
    ('ERAS', 'Forma de pasado de un verbo copulativo para una persona.'),
    ('ESTA', 'Determinante demostrativo femenino que señala algo cercano.'),
    ('NETA', 'Adjetivo femenino que indica que una cantidad queda limpia de descuentos.'),
    ('RETA', 'Forma verbal que significa desafiar a alguien.'),
    ('SEAN', 'Forma plural de subjuntivo de un verbo que expresa identidad o existencia.'),
    ('SERA', 'Bolsa grande tejida con esparto.'),
    ('SETA', 'Hongo con sombrero y pie; algunas especies son comestibles.'),
    ('SEN', 'Arbusto oriental cuyas hojas se emplean en infusión.'),
    ('TENA', 'Conjunto de útiles empleados en una modalidad de pesca.'),
    ('SENA', 'Otro nombre de un arbusto cuyas hojas se emplean en infusión.'),
    ('TASE', 'Forma de subjuntivo del verbo que consiste en fijar el precio de algo.'),
    ('TREN', 'Vehículo formado por vagones que circulan por raíles.'),
    ('TRES', 'Número que sigue al dos.'),
    ('TRAE', 'Forma verbal que indica llevar algo hacia quien habla.'),
    ('TRAS', 'Preposición que indica posterioridad o posición detrás de algo.'),
    ('ARE', 'Forma de subjuntivo del verbo que consiste en abrir surcos en la tierra.'),
    ('ASE', 'Forma singular de presente de subjuntivo de asar.'),
    ('ERA', 'Época o etapa histórica; también forma de pasado verbal.'),
    ('ESA', 'Determinante demostrativo femenino que señala algo alejado.'),
    ('RES', 'Cabeza de ganado vacuno.'),
    ('SEA', 'Forma verbal de subjuntivo usada para expresar deseo o posibilidad.'),
    ('SER', 'Verbo copulativo que expresa identidad, naturaleza o existencia.'),
    ('TAN', 'Adverbio que expresa intensidad o grado.'),
    ('TEA', 'Astilla resinosa que se enciende para alumbrar.'),
    ('TEN', 'Mandato dirigido a una persona para que posea o conserve algo.')
) AS v(word, hint_text)
JOIN paraulogic_sets s ON s.letters = 'AENRST'
JOIN paraulogic_words w ON w.set_id = s.id AND w.word = v.word
ON CONFLICT (set_id, word_id, hint_order) DO UPDATE
SET hint_text = EXCLUDED.hint_text;

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
-- Debe devolver: 3 juegos, 1 set, 57 palabras, 57 pistas, 1 palabra de Wordle
-- y 1 acertijo. El test de integridad de la spec 002 falla si alguna cifra no
-- coincide, así que esta consulta es solo para revisarla a ojo.
-- =============================================================================

SELECT 'games'              AS tabla, COUNT(*) AS filas FROM games
UNION ALL SELECT 'paraulogic_sets'   AS tabla, COUNT(*) AS filas FROM paraulogic_sets
UNION ALL SELECT 'paraulogic_words',  COUNT(*) FROM paraulogic_words
UNION ALL SELECT 'paraulogic_hints',  COUNT(*) FROM paraulogic_hints
UNION ALL SELECT 'wordle_words',      COUNT(*) FROM wordle_words
UNION ALL SELECT 'riddles',           COUNT(*) FROM riddles;
