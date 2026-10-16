# Spec 006 — Frontend accesible

**Estado:** en implementación — la base (R-001 a R-013) está hecha; los juegos
(R-014 a R-020) se están construyendo
**Fase:** 5 de 7
**Constitución:** §1.1 y §4 (accesibilidad), §2.1.4 y §2.1.6 (los juegos),
§3.1 (idiomas)

## 1. Propósito

La accesibilidad **no es un extra de este proyecto: es el producto** (§1.1). El
usuario objetivo tiene dificultades visuales, motrices o cognitivas, o
simplemente no está familiarizado con la tecnología. Cualquier decisión de
diseño se juzga con una pregunta: *¿puede usarlo alguien de 75 años con
problemas de vista?*

Esta spec construye la base visual y de navegación, **y los tres juegos sobre
ella**. Define el sistema de tokens de diseño, la navegación por teclado, la
estructura semántica y el diccionario de textos, de forma que los juegos
hereden la accesibilidad en vez de tener que reimplementarla pantalla a
pantalla.

> **Por qué los juegos están en esta spec y no en otra.** Se decidió así el
> 2026-10-16, y es un cambio de alcance, no un descuido. La versión anterior de
> esta spec dejaba «la lógica visual de los tres juegos» fuera y remitía a «specs
> de la fase 6» que nunca se escribieron: la consecuencia fue que la API de los
> tres juegos quedó completa y **sin ninguna pantalla donde jugar**, y que la
> spec 008 quedó bloqueada sin poder auditar lo que no existía. Añadirlo aquí
> cierra ese hueco.
>
> Lo que cambia respecto a la primera versión: esta spec **toca el backend**.
> Antes era solo frontend. Ver §6.

## 2. Alcance

**Incluye:**

- Sistema de tokens de diseño (tipografía, color, espaciado, tamaños).
- Navegación por teclado con foco visible.
- Estructura semántica y HTML correcto.
- Diccionario centralizado de textos de UI.
- Páginas base: portada, lista de juegos, registro, login.
- **Las pantallas de los tres juegos** (R-014 a R-020).
- Verificación automática de accesibilidad.

**Fuera de alcance:**

- Clasificación y chat (spec 007).
- E2E completo en tres dispositivos (spec 008); aquí la auditoría de cada
  pantalla de juego, que es lo que R-005 necesita para no bloquearla.

## 2.bis Ampliación de alcance — 2026-10-16

La base de esta spec (R-001 a R-013) se implementó y se cerró. Al escribir los
juegos aparecieron **tres requisitos de la constitución que no existían en
ninguna spec**, y que sin ellos las pantallas no pueden cumplir §2.1.4 y
§2.1.6. Se añaden aquí, con su número, antes de escribir el código (§0.3):

| Hueco | Origen | Requisito |
| --- | --- | --- |
| No se puede reportar una respuesta correcta rechazada | §2.1.4 | R-017 |
| No existe el botón «Saltar partida» | §2.1.6 | R-015 |
| El estado «jugado / sin jugar» de la lista está escrito a mano | §2.1.6 | R-018 |

Los tres son **requisitos de la constitución, no decisiones nuevas**. Lo que se
decide en esta spec es cómo se cumplen, y por eso se documentan aquí antes de
tocarlas.

## 3. Requisitos

### R-001 — Tipografía ampliable

- Tamaño de fuente base **16px** como mínimo.
- Control para aumentar el tamaño **hasta el 200%**.
- El aumento **persiste** entre recargas y naveecciones.
- La tipografía es sans-serif y de lectura clara.
- **Ningún texto** se incrusta como imagen.

### R-002 — Objetivos táctiles

- Botones y enlaces tienen un área mínima de **44×44px**.
- Los controles contiguos están bien separados.
- El espaciado se mantiene al aumentar el tamaño de fuente.

### R-003 — Contraste

- Contraste mínimo **4.5:1** en texto normal, **3:1** en texto grande y
  bordes de controles.
- Ningún color del sistema queda por debajo del umbral.
- El contraste se **verifica automáticamente**, no se estima a ojo.

### R-004 — Sin depender solo del color

- Toda información que se transmite por color va **también** por texto, icono
  o forma.
- Esto es obligatorio en Wordle: la pista de cada letra no puede ser solo el
  color (§2.1.4).

### R-005 — Navegación por teclado

- **Todo** es accesible con teclado, sin necesidad de ratón.
- El foco es **siempre visible** y no queda oculto tras overlays.
- El orden del foco sigue el orden visual.
- No hay trampas de foco: se puede escapar de cualquier componente.
- El contenido saltable permite llegar al principal en una tecla.

### R-006 — HTML semántico

- Se usan elementos nativos: `button`, `label`, encabezados jerárquicos.
- Cada campo de formulario tiene su `label` asociado.
- Cada imagen tiene `alt`; decorativas, `alt=""`.
- Los botones que solo tienen icono llevan `aria-label` en español.
- El documento declara `lang="es"`.

### R-007 — Diccionario de textos

- **Todas** las cadenas visibles en la UI están en un diccionario central
  (§4.2).
- No hay texto hardcodeado dentro de los componentes.
- El diccionario está en español y usa lenguaje llano, sin tecnicismos.

### R-008 — Animación y sonido

- Se respeta `prefers-reduced-motion`.
- No hay animaciones que puedan provocar mareo, ni parpadeos, ni destellos.
- No hay sonido, o es desactivable.
- Ninguna partida tiene temporizador que expire sin aviso (§4.1).

### R-009 — Mensajes en lenguaje llano

- Los errores dicen **qué pasó y qué hacer**, sin códigos técnicos.
- No hay "Error 500" ni "undefined" en pantalla.
- Los mensajes de validación se asocian a su campo y se anuncian.

### R-010 — Escalado y reflow

- Sin **scroll horizontal** en móvil (360px), tablet ni escritorio (§7.1).
- El contenido no se superpone al aumentar el tamaño al 200%.
- Con zoom del navegador al 200% no se pierde contenido.

### R-011 — Páginas base

- **Portada:** bienvenida, acceso al registro y al login, y enlace a la
  clasificación.
- **Lista de juegos:** los tres juegos, cada uno con nombre, descripción clara y
  el estado (jugado / sin jugar).
- **Registro** y **login:** accesibles, con validación en lenguaje llano.
- Todas con el mismo esqueleto: `main`, encabezados jerárquicos y navegación.

### R-012 — Verificación automática de accesibilidad

Existe una prueba automática que audita cada pantalla:

- Se ejecuta **axe-core** sobre portada, lista de juegos, registro y login.
- **Cero violaciones** de nivel A y AA.
- La auditoría falla si aparece una violación nueva.
- Cubre contraste, nombres accesibles, orden del foco y etiquetas.

> Esta auditoría es el punto 4 de §4.3: la accesibilidad se **prueba**, no se
> supone. La comprobación manual del checklist de §4.1 y §4.2 es obligatoria
> **además** de esto, no un sustituto.

### R-013 — Validación de los datos de la API en el cliente

- Los datos que llegan de la API se **validan en tiempo de ejecución** antes
  de usarse (§3.2).
- Si un campo esperado falta o tiene un tipo inesperado, la UI lo detecta y
  muestra un mensaje claro en vez de romperse en silencio.

### R-014 — Se puede jugar a los tres juegos

- Las tres pantallas de juego existen y **son jugables de principio a fin** con
  solo teclado.
- El botón «Jugar» de la tarjeta de cada juego lleva a su pantalla, no a un
  sitio sin salida (§2.1.6).
- La mecánica vive **en el cliente**; el servidor valida y puntúa (§2.1.6,
  §6.6). El cliente nunca decide si una palabra vale.
- **Ningún texto del juego está escrito en el código**: enunciado, pistas y
  descripciones los sirve la API (§2.1.2).
- Al volver a un juego se recupera el progreso exacto (§2.1.7), y la pantalla
  **avisa** de que no es la primera vez: nunca aparece como si fuera.

### R-015 — Nunca se queda atrapado

- Botón **«Saltar partida»** visible en las tres pantallas (§2.1.6).
- Es **un solo paso**, sin confirmación: volver atrás no es una acción
  destructiva y nadie debería tener que confirmar que quiere dejar de jugar.
- Saltar **no pierde el progreso**. En Paraulógic y Acertijo solo se sale.
- En Wordle, abandonar **consume la única partida** y muestra el resultado, que
  es lo que §2.1.4 ya define: al terminar o abandonar, no se puede volver a
  jugar y la pantalla enseña lo hecho.
- El enlace a la lista de juegos y a la portada están visibles en las tres
  pantallas, sin tener que pasar por un menú.

### R-016 — Lo específico de cada juego, sin rehacer la accesibilidad

- **Paraulógic:** se ven las letras del conjunto y cuántas palabras faltan. Se
  escribe una palabra y el servidor dice si es correcta. Los intentos son
  ilimitados y **no hay estado de derrota** (§2.1.4). Botón de pista opcional que
  no resta puntos (§2.1.5).
- **Wordle:** cinco huecos, seis intentos. Cada intento devuelve **tres pistas por
  letra** y cada pista se dice **por texto e icono**, nunca solo por color
  (§2.1.4). Se muestran las letras ya descubiertas, para no obligar a memorizar.
  Solo se puede jugar una vez.
- **Acertijo:** enunciado y respuesta en texto libre. Fallar **no penaliza**
  (§2.1.5): la pantalla lo dice, para que nadie deje de intentar por miedo a
  perder algo.
- Los tres patrones visuales nuevos (la fila de letras de Wordle, el tablero de
  Paraulógic, el contador del acertijo) se añaden **al sistema de diseño**, no se
  resuelven dentro del componente (§3.3).

### R-017 — Reportar una respuesta correcta rechazada

- Si alguien cree que su respuesta **era correcta** y el sistema la rechazó,
  puede reportarlo (§2.1.4).
- El botón aparece **solo cuando la respuesta se ha rechazado**, nunca antes: un
  botón de «reportar» siempre visible invites a usarlo sin motivo, y el reporte
  no concede puntos (§2.1.4).
- El reporte guarda **lo que escribió la persona y qué acertijo era**. No guarda
  nada más: ni su `username`, ni su IP (§6.5).
- **No hay moderación de reportes** y el punto queda vacío a propósito: nadie va
  a leerlo. Se registra como deuda, igual que el chat (§6.8).
- La pantalla dice con claridad que **el reporte no da puntos**. Prometer lo que
  no ocurre es un dark pattern (§6.4).
- El reporte se puede **ver** en la misma pantalla después de enviarlo, para que
  quien lo mandó sepa que se ha registrado.

### R-018 — El estado real de cada juego en la lista

- `GET /api/games` devuelve, por juego, si hay partida y los puntos.
- La lista dice **la verdad**: nada de «Sin jugar» escrito a mano.
- Sin sesión se devuelven los valores **neutros** (sin partida, cero puntos) y la
  lista se ve igual (§2.4). El estado de «jugado» es de la cuenta, no del juego.
- Se pide **en una sola llamada**, no una por juego: son tres juegos y abrir la
  lista no debería costar tres peticiones.

### R-019 — Cambios en el contrato con la API

- Este es el contrato React↔FastAPI, **la frontera más crítica del sistema**
  (§2.5). Los cambios que añade esta spec se documentan aquí **antes** de
  escribirlos.
- `GET /api/games` **añade** dos campos por juego, `played` y `score`. No quita
  ni cambia ninguno de los que ya había: `game_id`, `name` y `description` se
  siguen footballers igual. Es una ampliación, no un cambio.
- `POST /api/games/{id}/abandon` **nuevo**: marca la partida como abandonada.
- `POST /api/games/riddle/report` **nuevo**: registra una respuesta rechazada que
  la persona cree correcta.
- Ningún campo nuevo acepta un valor que el cliente pueda usar para falsear algo.
  El estado de la partida y la puntuación los decide el servidor (§6.6).

### R-020 — Cada juego se audita como cualquier otra pantalla

- axe-core pasa por las tres pantallas de juego, **en todos sus estados**:
  vacío, con palabras escritas, con error de validación, con la partida
  terminada y con Wordle ya jugado.
- Auditar solo el estado vacío es lo que hace que la suite pase sin comprobar
  nada: la pantalla vacía no tiene la fila de letras, ni el contador, ni el
  botón de pista, que es donde hay problemas.
- Sin scroll horizontal a 360px ni con la fuente al 200%, en las tres
  pantallas (R-010).

## 4. Criterios de aceptación

- [x] El tamaño de fuente se puede subir al 200% y persiste al recargar.
- [x] Todos los botones miden al menos 44×44px.
- [x] axe-core no reporta ninguna violación A ni AA en las cuatro pantallas.
- [x] Todo el recorrido es navegable solo con teclado.
- [x] El foco es visible en todos los elementos interactivos.
- [x] Ninguna cadena de texto está hardcodeada en los componentes.
- [x] `prefers-reduced-motion` desactiva las animaciones.
- [x] No hay scroll horizontal a 360px ni al zoom del 200%.
- [x] Los errores se muestran en lenguaje llano.
- [x] El documento declara `lang="es"`.
- [x] Los datos inválidos de la API producen un mensaje, no una pantalla rota.

### De los juegos

- [ ] Se puede jugar a los tres juegos enteros solo con teclado.
- [ ] El botón «Jugar» de cada tarjeta lleva a su juego.
- [ ] «Saltar partida» está visible en las tres pantallas y es un solo paso.
- [ ] Volver a un juego restaura el progreso y avisa de que no es la primera vez.
- [ ] En Wordle las tres pistas de cada letra se distinguen sin color.
- [ ] Fallar no resta puntos, y la pantalla lo dice.
- [ ] El botón de reportar solo aparece tras una respuesta rechazada.
- [ ] El reporte no concede puntos y la pantalla no promete que sí.
- [ ] La lista de juegos dice si cada juego está jugado, sin escribirlo a mano.
- [ ] axe-core no reporta violaciones A ni AA en las pantallas de los juegos,
      en ningún estado.
- [ ] Ninguna palabra, enunciado ni pista está escrito en el código del cliente.

## 5. Dependencias y referencias

- **Predecesoras:** 001 (entorno), 003 (autenticación), 004 (API de contenido de
  los juegos), 005 (persistencia de partidas).
- **Sucesoras:** 007 hereda estos tokens; 008 queda desbloqueada cuando las tres
  pantallas de juego existan.
- **Constitución:** §1.1 (accesibilidad como producto), §2.1.4 (los tres
  juegos), §2.1.6 (requisitos comunes), §2.1.7 (partidas persistentes),
  §2.5 (frontera crítica), §3.3 (sistema de diseño), §4.1 (diseño), §4.2
  (técnico), §4.3 (verificación), §6.5 (datos mínimos), §6.6 (anti-trampas),
  §3.1 (idiomas), §3.2 (JavaScript).

## 6. Qué toca el backend, y por qué

Esta spec nació como solo-frontend y ahora no lo es. El cambio es acotado y se
justifica aquí, porque §2.5 obliga:

| Cambio | Por qué no se puede hacer solo en el cliente |
| --- | --- |
| `played` y `score` en `GET /api/games` | El estado de la partida está en PostgreSQL (§2.1.7). Pedirlo desde el cliente obligaría a tres peticiones y a elegir qué endpoint gana si alguno falla. |
| `POST /api/games/{id}/abandon` | La columna `abandoned` existe y **nada la escribe**. Marcar una partida abandonada desde el navegador sería dejar que el cliente decida el estado de su partida. |
| `POST /api/games/riddle/report` | El reporte tiene que persistirse. Guardarlo en `localStorage` sería perderlo en cuanto se cierra el navegador, y la constitución dice que el estado vive en PostgreSQL (§7). |

**Nada de esto permite al cliente falsear nada.** El estado, la puntuación y la
validez de una respuesta los decide siempre el servidor (§6.6).