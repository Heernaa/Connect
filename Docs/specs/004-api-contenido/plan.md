# Plan — Spec 004: API de contenido de los juegos

**Estado:** implementada
**Progreso:** 20/20 tareas
**Rama:** `feature/spec-004-api-contenido`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 — Listado de juegos

- [x] 4.1 Implementar `GET /api/games` con identificador, nombre y descripción.
      → *R-001*
- [x] 4.2 Verificar que el listado **no incluye** la palabra de Wordle ni la
      respuesta del acertijo.
      → *R-001*
- [x] 4.3 Test: la respuesta del listado no contiene ninguna palabra del
      contenido.
      → *R-001*

### R-002 — Contenido de Paraulógic

- [x] 4.4 Implementar `GET /api/games/paraulogic`: letras del conjunto y
      número de palabras pendientes.
      → *R-002*
- [x] 4.5 Garantizar que **no** se devuelven las soluciones ni las palabras ya
      encontradas.
      → *R-002*
- [x] 4.6 Test: la respuesta no contiene ninguna de las 57 palabras.
      → *R-002*

### R-003 — Pistas de Paraulógic

- [x] 4.7 Implementar `GET /api/games/paraulogic/hint` que devuelve **una**
      pista de una palabra no encontrada.
      → *R-003*
- [x] 4.8 Priorizar palabras con `is_common = false`.
      → *R-003*
- [x] 4.9 Verificar que la pista **no revela** la palabra.
      → *R-003*
- [x] 4.10 Confirmar que pedir pistas **no** toca la puntuación.
      → *R-003*
### R-004 y R-005 — Contenido de Wordle y Acertijo

- [x] 4.11 Implementar `GET /api/games/wordle`: palabra de 5 letras solo si la
      partida está iniciada.
      → *R-004*
- [x] 4.12 Si el jugador ya terminó su única partida, devolver el indicador de
      finalizado **en lugar de** la palabra.
      → *R-004*
- [x] 4.13 Implementar `GET /api/games/acertijo` que devuelve solo el
      enunciado.
      → *R-005*
- [x] 4.14 Test: el endpoint de acertijo no contiene `accepted_answer`.
      → *R-005*

### R-006 — Validación de respuestas

- [x] 4.15 Implementar la normalización: minúsculas, sin tildes, sin
      puntuación y sin espacios sobrantes.
      → *R-006*
- [x] 4.16 Implementar la comparación en el servidor y devolver solo
      acertado / no acertado.
      → *R-006*
- [x] 4.17 Tests: respuesta con distinta capitalización, con tildes y con
      espacios de más se aceptan.
      → *R-006*

### R-007 — Validación de entradas

- [x] 4.18 Definir los modelos Pydantic de entrada de cada endpoint.
      → *R-007*
- [x] 4.19 Devolver `422` con mensajes en lenguaje llano, sin trazas técnicas.
      → *R-007*
- [x] 4.20 Revisar las pistas contra todas las respuestas válidas del conjunto:
      ninguna pista puede contener una respuesta de la misma longitud que la
      palabra descrita.
      → *R-003* — la API revela la longitud junto con la pista, así que una
      respuesta de esa longitud sí sería accionable.

## Verificación de la spec

- [x] V.1 El listado funciona sin sesión.
- [x] V.2 El listado no contiene soluciones.
- [x] V.3 Paraulógic devuelve letras y pendientes, sin soluciones.
- [x] V.4 Las palabras ya encontradas no aparecen.
- [x] V.5 Las pistas priorizan las palabras poco comunes.
- [x] V.6 La pista no contiene la palabra descrita ni otra respuesta válida de
      su misma longitud.
- [x] V.7 Pedir pistas no descuenta puntos.
- [x] V.8 Wordle no devuelve la palabra a quien ya terminó.
- [x] V.9 El acertijo no expone `accepted_answer`.
- [x] V.10 La respuesta se acepta con tildes y mayúsculas distintas.
- [x] V.11 Wordle no devuelve la palabra sin sesión.

## Notas

- Los tests "no contiene soluciones" son los importantes de esta spec. Se
  escriben con una comprobación literal sobre el cuerpo de la respuesta, no
  mirando campos concretos: así siguen siendo válidos si el formato cambia.
- La normalización del acertijo (§4.15) es una función pura. Conviene
  testearla aislada antes de conectarla al endpoint.
- Wordle **no** implementa aquí la lógica de intentos ni las pistas de letras
  (verde / amarillo / gris). Eso es presentación y validación, y va en la spec
  005 con la puntuación.
- **La tabla `games` sí se crea en esta spec**, aunque la spec 002 no la
  listara: es el catálogo que necesita el requisito R-001 (`GET /api/games` con
  nombre y descripción). Llega en su propia migración y sus nombres están en el
  seed, porque también son contenido (§2.1.2).
- **Los errores HTTP se traducen también.** Una ruta inexistente devolvía
  `{"detail": "Not Found"}`, una forma distinta de la del resto de errores. Ahora
  todos los errores salen como `{"message": "..."}`. El manejador registrado es el
  de Starlette y no el de FastAPI: el 404 de una ruta inexistente lo lanza
  Starlette, y con el de FastAPI se escaparía sin traducir.
- **Dos fallos de contenido encontrados por los tests**, ambos en las pistas de
  Paraulógic:
  1. El `JOIN` del seed emparejaba cada palabra con la **primera pista** de la
     lista, así que las 21 palabras compartían el mismo texto de ayuda.
  2. Tres pistas contenían su propia palabra: «el imperativo de "traer"» ya te
     dice que la palabra es `TRAE`.
  Los dos estaban en el seed y pasaban el test de recuento. Ahora hay un test que
  comprueba que cada palabra tiene **su** pista, con un texto distinto.
- La regla de filtración se expresa según lo que ve el jugador: la API revela la
  longitud de la respuesta pendiente, por lo que una palabra de esa longitud
  dentro de la pista le da una respuesta posible. Palabras más cortas o largas
  no se pueden confundir con la solución y no hacen la pista accionable.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.
