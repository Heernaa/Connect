# Constitución del Proyecto — ProyectoInicial

> Documento normativo. Define los principios, límites y reglas de trabajo que
> **deben** seguirse al contribuir a este repositorio. Tiene prioridad sobre
> preferencias personales, hábitos previos o instrucciones de tareas puntuales.
>
> Si una instrucción de una tarea entra en conflicto con esta constitución,
> la constitución gana. Si el conflicto es inevitable, hay que pedir
> aprobación explícita y documentar la excepción en el registro de decisiones.

**Estado:** v0.9 — placeholders de las specs 001-005 resueltos, listo para construir
**Última actualización:** 2026-10-16

---

## 0. Estado de las decisiones

### 0.1 Decidido

| Elemento                     | Valor                                                    |
| ---------------------------- | -------------------------------------------------------- |
| Nombre del proyecto          | **Connect**                                               |
| Tipo de producto             | Plataforma web de juegos sencillos con comunidad         |
| Usuario objetivo             | Personas mayores (60+), con necesidades de accesibilidad |
| Dispositivos objetivo        | Ordenadores, tablets y móviles (§7)                      |
| Frontend                     | React + Tailwind CSS, en **JavaScript** (§3.2)           |
| API / Backend                | FastAPI (Python)                                         |
| Base de datos                | PostgreSQL                                               |
| Pruebas E2E                  | Playwright                                               |
| Método de desarrollo         | SDD spec-anchored (§0.3)                                 |
| Idioma del código            | Inglés                                                   |
| Idioma de UI y documentación | Español                                                  |
| Idioma del contenido de juegos | Español (único, sin multiidioma)                      |
| Origen del contenido de juegos | PostgreSQL, servido por la API (§2.1.2)              |
| Alcance                      | MVP: un único set por juego, sin rotación diaria (§2.1.3) |
| Identidad visible            | Anónima. Cada usuario tiene un alias autogenerado (§6.5)  |
| Accesibilidad                | WCAG 2.2 nivel AA (§4)                                   |
| Transporte del chat          | Polling (§2.3)                                           |
| Moderación del chat          | No incluida. Bloqueo sí, reporte no (§6.8)                |
| Autenticación                | Nombre de usuario + contraseña. Sin correo (§2.2)        |
| Almacenamiento de contraseñas | Hash, nunca cifrado (§6.2)                               |
| Entorno                      | Local. Sin despliegue (§7.0)                              |
| Puntuación Paraulógic        | 1 punto por palabra encontrada (§2.1.5)                  |
| Partida Paraulógic           | Intentos infinitos, no se puede perder, pausable (§2.1.4) |
| Puntuación Wordle            | Base 100, −10 % por intento usado (§2.1.5)                |
| Puntuación Acertijo          | 10 puntos fijos al acertar (§2.1.5)                       |
| Longitud mínima de contraseña| 8 caracteres, sin exigir símbolos (§6.2)                  |
| Framework de pruebas         | `pytest` + `httpx` (§5)                                   |
| Retención del chat            | A definir. Sin moderación, el periodo se revisa (§2.3)   |
| Contenido del MVP             | 1 Wordle, 1 acertijo, 1 set de Paraulógic (21 palabras) §2.1.8 |

### 0.2 Pendiente de decisión

Estos valores bloquean el trabajo que dependa de ellos. **No se inventan: se
preguntan.** Las dudas concretas están recogidas en [`dudas.md`](./dudas.md).

| Placeholder         | Qué falta decidir                            | Bloquea |
| ------------------- | -------------------------------------------- | ------- |
| `[CHAT_RETENTION]`  | Cuánto tiempo se conservan los mensajes       | §2.3    |
| `[POLL_INTERVAL]`   | Cada cuántos segundos se consulta el chat     | §2.3    |
| `[CONTENT_SIZE]`    | Cuántas palabras y acertijos hay en el MVP    | §2.1.3  |

> **Regla:** un placeholder sin resolver **bloquea** el trabajo que dependa de él.

> **Nota.** Los placeholders `[TEST_UNIT]`, `[MIN_PASSWORD_LEN]`,
> `[WORDLE_POINTS]` y `[ACERTIJO_POINTS]` se resolvieron el 2026-10-16 y
> constan en §0.1. `ACERTIJO_POINTS` no figuraba en la tabla: se añadió al
> detectar que la tarea 5.13 de la spec 005 dependía de él.
>
> `[CONTENT_SIZE]` sigue pendiente aunque §2.1.8 ya concrete el contenido del
> MVP. No se marca como resuelto sin una decisión explícita del equipo.
>
> **Nota.** `[DEPLOY_TARGET]` y `[AUTH]` ya no son placeholders: el entorno es
> local (§7.0) y la autenticación está definida (§2.2, §6.2).

### 0.3 Método de trabajo: SDD spec-anchored

El proyecto se construye con un método **spec-anchored**: la especificación es
la fuente de verdad, y el código se escribe para cumplirla.

**Qué es una spec**

Una especificación es un documento en `Docs/specs/NNN-<nombre>/` con dos
archivos:

- `spec.md` — **qué** se construye, con requisitos numerados y verificables.
- `plan.md` — **cómo** se construirá, con tareas numeradas y seguibles.

Cada spec sigue el ciclo de §4 (especificación → diseño → implementación →
pruebas → revisión → documentación).

**Implicaciones: son obligatorias**

1. **Nada se implementa sin una spec aprobada que lo cubra.** Si una tarea de
   código no corresponde a ningún requisito de ninguna spec, no entra.
2. **Los requisitos se numeran** (`R-001`) y **se verifican**. Nada de "que sea
   usable" o "que quede bonito": o hay un criterio comprobable, o no es un
   requisito.
3. **Cada tarea del plan cita el requisito que implementa.** Sin requisito
   citado, la tarea no existe.
4. **Cada test verifica un requisito**, no una implementación. Si el test hay
   que reescribirlo cada vez que cambia el código por dentro, está mal escrito.
5. **Código sin requisito que lo justifique se borra.** Es deuda y nada más.
6. **Cambiar un requisito: primero la spec, después el código.** Nunca al revés.
   El commit que cambia el requisito y el que ajusta el código pueden ser
   distintos, pero el orden es ese.
7. **Una rama por spec**, nombrada `feature/spec-NNN-<slug>`.
8. **Una spec no se da por terminada** hasta que sus tareas estén marcadas en
   `plan.md` y sus criterios de aceptación estén satisfechos.

**La regla que resume todas las demás**

> Si el código y la spec discrepan, es un bug en el código o un bug en la spec.
> **Nunca se arregla modificando solo el código.** La spec se revisa, se acepta
> o se corrige; y solo entonces el código la sigue.

**Qué se traduce en el día a día**

- No se empieza a escribir código sin la spec correspondiente ya escrita.
- Un requisito que nadie puede comprobar no está bien escrito.
- Las specs se actualizan cuando cambia el producto, no a posteriori para
  justificar lo que ya se hizo.

---

## 1. Principios fundacionales

Seis principios, en orden de prioridad. En caso de conflicto, manda el primero.

### 1.1 La accesibilidad no es un extra, es el producto

Nuestro usuario objetivo tiene dificultades visuales, motrices, cognitivas o
simplemente no está familiarizado con la tecnología. Todo lo que pueda
hacer una persona mayor debe estar permitido — siempre que no afecte a la
seguridad (§6) o al funcionamiento del sistema. Antes de proponer una función,
preguntarse: **¿puede usarla alguien de 75 años con difficulties visuales?**

Corolarios no negociables:

- Nunca se **pierde** funcionalidad por un problema de accesibilidad.
- El mal diseño accesible que resulta **confuso** es un bug, no una preferencia.

### 1.2 Claridad antes que velocidad

Escribir el requerimiento es parte del trabajo, no un trámite previo. Ninguna
funcionalidad se implementa sin saber, por escrito, qué problema resuelve, quién
la usa y cómo se sabe que está terminada.

### 1.3 Simple antes que sofisticado

Preferir la solución que cualquier persona del equipo pueda leer y modificar
dentro de seis meses. La complejidad no justificada es deuda, no una ventaja.
Esto aplica especialmente a los juegos: _"sencillos"_ es un requisito de producto,
no una limitación de presupuesto.

### 1.4 La calidad no es negociable, la velocidad sí

Un cambio rápido con pruebas, revisión y documentación vale más que un cambio
escrito con deuda acumulada.

### 1.5 Cambio pequeño y reversible

Cambios pequeños, frecuentes, por separado. Nada de "mega-commits" que mezclan
refactor y funcionalidad.

### 1.6 Seguridad y datos primero

Ninguna decisión de diseño se toma sin preguntarse qué pasa con los datos del
usuario y con un atacante. Con usuarios mayores la manipulación es un riesgo
real: el producto **no** puede diseñar cebos (§6.4).

---

## 2. Alcance del proyecto

`ProyectoInicial` es una **plataforma web de juegos sencillos** con un fuerte
componente social, diseñada para personas mayores.

Cuatro dominios funcionales, en orden de prioridad de implementación:

### 2.1 Juegos

Juegos de **lógica y palabras**, jugados desde el navegador. Todos son de
turnos, sin presión de tiempo, y comparten un único modelo de datos.

#### Catálogo inicial (v1)

| # | Juego | Origen | Tipo | Objetivo del jugador |
|---|---|---|---|---|
| 1 | **Paraulógic** | Inspirado en *Paraulogical* | Deducción de palabras | Averiguar todas las palabras que forman las letras |
| 2 | **Wordle** | Inspirado en *Wordle* | Deducción de letras | Rellenar 5 huecos y saber si cada letra está o en qué sitio |
| 3 | **Acertijo** | Propio | Pregunta con respuesta | Pensar la respuesta y acertarla |

Los tres son **textuales y sin límite de tiempo**, lo cual los hace especialmente
adecuados para el usuario objetivo (§1.1). Ninguno requiere precisión motora
fina ni reflejos.

Todos son **juegos de pensar**: el valor está en el ejercicio mental, no en la
velocidad ni en la puntería. La puntuación refleja ese enfoque (§2.1.5).

#### 2.1.1 Modelo común

Los tres juegos comparten un contrato único. Un jugador siempre tiene
`GameId` + `PlayerId` + estado de partida, independientemente del juego:

- `PlayerId` — referencia al usuario.
- `GameId` — identificador del tipo de juego. Todo estado de partida incluye el.
- `StartedAt` / `FinishedAt` / `Abandoned` — control temporal.
- `Score` — puntuación, validada por el servidor.
- `Solved` / `Attempts` — resultado y número de intentos.

**Regla:** añadir un cuarto juego **no** puede exigir cambiar las tablas de
usuarios, puntuaciones ni clasificación. El aislamiento por juego se resuelve
con `GameId`, no con esquemas paralelos.

#### 2.1.2 Contenido servido por la API

**Todo el contenido de los juegos vive en PostgreSQL y se sirve por la API.**
La base de datos es la única fuente de verdad: palabras, pistas, acertijos y
respuestas correctas. En el cliente **no hay ni una palabra de juego escrita a
mano**.

| Contenido | Origen | Nunca en el cliente |
|---|---|---|
| Palabra objetivo de Wordle | Tabla de palabras, vía API | Sí |
| Pistas de Paraulógic | Tabla de pistas, vía API | Sí |
| Enunciado y respuesta del Acertijo | Tabla de acertijos, vía API | La respuesta correcta, nunca |

**Regla:** el cliente pide el contenido, lo muestra y envía intentos. No decide
qué palabra es la correcta ni cuál es la respuesta válida.

**Idioma:** todo el contenido es **en español**. No habrá traducción ni
multiidioma en el MVP. El modelo de datos incluye `lang` para no bloquear la
extensión futura, pero su valor es siempre `es`.

#### 2.1.3 Alcance del MVP: un único set por juego

Este es un **MVP**: hay **un solo set de datos por juego**, fijo, y **no se
actualiza a diario**.

- [ ] No hay "palabra del día", ni rotación por fecha, ni variantes.
- [ ] Todos los jugadores resuelven **la misma** palabra y el mismo acertijo.
- [ ] La mejora del contenido (más palabras, más acertijos) es una **tarea
      manual**, no una funcionalidad automática.
- [ ] **El contenido NO es un secreto**: en un MVP público es asumible que
      alguien descubra la solución. La protección real llega en la v2, cuando
      el producto se use de verdad.

> **Aviso de riesgo — importante.** Con un set único, la puntuación deja de
> medir habilidad y pasa a medir **quién juega más veces**. Ver §2.1.5.

#### 2.1.4 Especificaciones de los juegos iniciales

**Paraulógic** — *sin límite de intentos y sin opción de perder*:
- El tablero muestra un **conjunto de letras** que, dispuestas de otra forma,
  forman **varias palabras**. El jugador debe **averiguarlas todas**.
- Hay un **único nivel activo** en MVP (un único set). Las palabras se cargan
  desde la base de datos por la API (§2.1.2).
- **Intentos infinitos.** No hay límite de intentos en absoluto.
- **No se puede perder.** No existe estado de derrota. El juego continúa
  indefinidamente hasta que el jugador puree todas las palabras.
- **Deducción sin pistas por defecto.** El jugador piensa y prueba libremente.
- **Botón de pista opcional**: da una ayuda. El jugador decide si lo usa.
- **Partida pausada y reanudable**: el jugador puede salir y **volver a entrar
  cuando quiera** sin perder progreso. El servidor guarda qué palabras ya
  encontró.
- Al entrar, se le muestran las palabras ya encontradas y las que faltan. Nunca
  empieza de cero sin avisar.

**Wordle** — *una sola partida por jugador*:
- Palabra de **5 letras**, **6 intentos**, servida por la API.
- **Cada jugador juega UNA única vez.** Al terminar (o abandonar), no puede
  volver a jugar. Si ya lo ha hecho, la pantalla muestra su resultado, no el
  juego.
- Interfaz de **huecos** que el jugador rellena, estilo página web.
- Tras cada intento, cada hueco muestra una de tres pistas:

  | Pista | Significado |
  |---|---|
  | ✅ En su sitio | La letra es correcta y está en la posición correcta |
  | 🟡 Está en la palabra | La letra existe pero está en otra posición |
  | ⬜ No está | La letra no aparece en la palabra |

- Pista **por texto y por icono**, nunca solo por color (§4.1).
- Se muestran todas las letras ya descubiertas, para no obligar a memorizar.

**Acertijo**:
- El jugador responde con texto libre a un enunciado.
- **Existe una respuesta correcta.** Se compara contra la almacenada en la base
  de datos y se acepta o se rechaza.
- **Objetivo del ejercicio = pensar**, no acertar a la primera. Por tanto la
  puntuación **no premia la rapidez**, premia el razonamiento. Un jugador que
  se equivoca y luego acierta obtiene crédito por haber acertado (§2.1.5).
- La normalización de la respuesta (mayúsculas, tildes, espacios) se hace
  **en el servidor**.
- Si el sistema no reconoce una respuesta que era correcta, el jugador puede
  reportarlo y se registra para revisión. Con mayores habrá casos legítimos de
  esto, y el reporte **no** concede puntos automáticamente.

#### 2.1.5 Sistema de puntuación

Regla común a los tres juegos: **se premia haber acertado, nunca la rapidez**
(§1.6). No se penaliza el tiempo en ningún juego.

**Paraulógic — 1 punto por palabra encontrada:**

| Regla | Detalle |
|---|---|
| **Puntos** | **1 punto por cada palabra encontrada.** Nada más. |
| **Intentos** | Infinitos. Fallar no cuesta nada. |
| **Pistas** | El botón de pista **no resta puntos**. Solo resta: la ayuda. |
| **Perder** | No se puede perder. |

> **Consecuencia asumida:** la puntuación de Paraulógic mide **cuántas palabras
> ha encontrado**, no su dificultad. Como los intentos son infinitos y las
> pistas son gratuitas, un jugador puede llegar al máximo sin ninguna
> habilidad especial. **Es una decisión consciente:** para este usuario, la
> frustración de perder es peor que una clasificación poco informativa. Se
> registra como deuda en §11.

**Wordle — una sola partida por jugador:**
- Base de **100 puntos**, con bonificación cuanto **menos intentos** se necesiten.
- Se resta un **10 % de la base por cada intento usado**. Acierto al primer
  intento: 100. Acierto al sexto: 50.
- Como solo se juega una vez, esta es la única puntuación con componente de
  eficiencia.

**Acertijo:**
- Se puntúa el acierto: **10 puntos fijos**.
- **Sin penalización** por intentos ni por tiempo. Un jugador que se equivoca
  tres veces y luego acierta cobra los mismos 10 puntos que uno que acierta a la
  primera (§2.1.4, §1.1).

**Regla transversal:** **quien completa algo, obtiene puntos.** Nadie se queda
en cero por confundir dos letras o por pedir una pista, que son los errores más
frecuentes a esta edad (§1.1).

#### 2.1.6 Requisitos comunes a todos los juegos
- [ ] Interfaz clara, sin destellos, sin comandos ocultos, con objetivos evidentes.
- [ ] Botón **"Saltar partida"** siempre visible: nunca se queda atrapado.
- [ ] La puntuación se calcula y persiste en el servidor (§2.5).
- [ ] La mecánica vive **en el cliente**; el servidor valida y puntúa (§6.6).
- [ ] Cada juego se puede jugar con **solo teclado**, sin ratón.
- [ ] El contenido del juego se pide a la API (§2.1.2). Cero contenido en el
      código del cliente.
- [ ] **Ninguna cuenta se queda bloqueada sin salida**: siempre se puede
      cambiar de juego, volver al inicio o pedir ayuda.

#### 2.1.7 Partidas persistentes (obligatorio)

El jugador puede **salir y volver** en cualquier momento, en cualquier juego, y
recuperar su progreso exacto. Esto es un requisito de producto, no una comodidad:

- El estado de la partida vive **en PostgreSQL**, nunca en memoria ni en el
  navegador (§7).
- Al volver a entrar, se restaura: palabras ya encontradas en Paraulógic,
  intentos usados en Wordle, acertijos respondidos.
- El estado se guarda **en el servidor en cada acción relevante**, no solo al
  cerrar. Si el navegador se cierra o el dispositivo falla, el progreso no se
  pierde.
- **No hay estado de derrota que perder** (§2.1.4). Nunca.

#### 2.1.8 Contenido del MVP

Contenido concreto cargado en `data/seed_v0.sql`. Es el mínimo acordado:

| Juego      | Cantidad | Detalle                                            |
| ---------- | -------- | -------------------------------------------------- |
| Wordle     | 1 palabra | `LUNAS` (5 letras)                                 |
| Acertijo   | 1         | "Tengo ciudades... ¿Qué soy?" → el mapa            |
| Paraulógic | 1 set    | Letras `A E N R S T` → **21 palabras**              |

**Requisito de Paraulógic:** mínimo 5 letras y al menos 10 palabras.
Cumple con margen: 6 letras y 21 palabras.

Regla de formación: cada palabra usa **solo** letras del conjunto y **ninguna
letra más veces** de las que aparece en él. Verificado por script, no a ojo.

Las palabras están marcadas con `is_common`: las cinco más literarias
(`NAT`, `SENAR`, `ATRE`, `ASTER`, `TRANSE`) están marcadas para que el botón de
pista las trate con más cuidado (§1.1).

> Con 21 palabras y 1 punto cada una, la puntuación máxima de Paraulógic es 21.

### 2.2 Cuentas de usuario

- **Nombre de usuario + contraseña.** Sin correo electrónico y sin verificación.
- Registro e inicio de sesión verificados por el servidor.
- Perfil mínimo: **alias anónimo** y puntuación. **Nada más** (§6.5).
- **No hay recuperación de contraseña.** Si se olvida, la cuenta se pierde y hay
  que crear otra. Riesgo asumido y documentado en §6.3.
- El alias anónimo se genera en el registro y **no depende** del nombre de
  usuario: conocer el nombre de usuario no revela el alias, ni al revés.
- **La identidad es anónima:** no hay nombre real, ni apellidos, ni foto, ni
  avatar. Cada usuario recibe un **alias autogenerado** (p. ej. `LoboTranquilo`).
  El alias **no es elegido por el usuario** y no revela nada sobre la persona
  real que hay detrás.
- El alias es estable: se usa en la clasificación, en el chat y en las
  puntuaciones. Es lo único que un usuario ve de otro.

### 2.3 Comunidad e interacción

- Ver la puntuación del resto de jugadores: clasificación global y por juego.
- Chat entre usuarios, con **alias anónimos**.
- Transporte por **polling**: el cliente consulta periódicamente y recibe lo
  nuevo. Intervalo `[POLL_INTERVAL]` (§0.2).
- **Sin moderación en el MVP** (§6.8). Ver el riesgo asumido.
- Retención de mensajes: `[CHAT_RETENTION]`.

### 2.4 Clasificación (leaderboard)

- Puntuación acumulada por usuario y por juego.
- Consultable sin iniciar sesión (modo espectador).
- Se muestra **alias, puntuación y juego**. Nada más (§6.5).
- Los datos se sirven desde PostgreSQL, nunca se calculan en memoria del proceso.

### 2.5 Frontera crítica

El contrato entre React y FastAPI —esquemas de request/response, códigos de
error, autenticación, validación de puntuación— es la **frontera más crítica
del sistema**. Cualquier cambio aquí se documenta antes de implementarse.

### 2.6 Fuera de alcance

Para mantener la constitución cumplible (§1.3):

- No hay monetización, ni anuncios, ni compras dentro del juego.
- No hay streaming de partida en directo.
- No hay aplicación móvil nativa: la web es responsive y cubre el objetivo
  (§7).
- No se hacen juegos multijugador en tiempo real. La interacción es asíncrona
  (puntuaciones y chat).
- No hay chat en tiempo real: es por polling (§2.3).
- No hay moderación de chat en el MVP (§6.8).
- No hay nombres reales, ni avatares, ni fotos de perfil (§2.2).

---

## 3. Estándares de código

### 3.1 Reglas de lenguaje

- **Código** en inglés: identificadores, funciones, comentarios técnicos.
- **UI y documentación** en español, sin tecnicismos innecesarios. Si un
  término técnico no se puede traducir understandably, se explica.
- Sin abreviaturas crípticas. Los nombres dicen qué hacen.

### 3.2 Convenciones obligatorias

- [ ] Un formatter y un linter definidos y ejecutados sin errores en cada commit.
- [ ] Sin `console.log`, prints de depuración ni secretos en el código.
- [ ] Sin código muerto ni funcionalidad comentada. Si no se usa, se elimina.
- [ ] Comentarios explican **por qué**, no **qué**. El código ya dice qué hace.
- [ ] El frontend se escribe en **JavaScript**, no en TypeScript.
- [ ] **El tipado fuerte se aplica donde protege de verdad: la frontera del
      servidor.** Anotaciones de tipo en Pydantic para toda respuesta y petición
      de la API, y validación en el borde (§6.1).
- [ ] En el cliente, los datos que llegan de la API se **validan en tiempo de
      ejecución** antes de usarse. No hay tipado estático, pero tampoco confianza
      ciega.
- [ ] Nombres en inglés, `camelCase` para variables, `PascalCase` para tipos.
- [ ] El código de un juego nuevo vive aislado del resto: no se toca la lógica
      de otros juegos para añadir uno nuevo.

### 3.3 Límites de módulo

Un archivo que pase de ~300 líneas es una señal de que algo no está bien
descompuesto. No es un límite absoluto, pero requiere justificación.

---

## 4. Accesibilidad

Es la sección más importante del proyecto (§1.1).

**Objetivo de conformidad: WCAG 2.2 nivel AA.** Decidido, no provisional.

Adicionalmente, y aunque WCAG no lo exija, se fijan estos mínimos de diseño
porque son los problemas típicos de la edad objetivo (§1.1):

- Fuente base **16px** con opción de ampliar hasta **200%**.
- Objetivos táctiles de **mínimo 44×44px**.
- Contraste **4.5:1** en texto.

### 4.1 Requisitos de diseño

- [ ] Tamaño de fuente base mínimo **16px**, y botón para aumentarlo hasta 200%.
- [ ] Tipografía sans-serif clara, alto contraste, sin texto sobre imágenes.
- [ ] Objetivos táctiles (botones, enlaces) de **mínimo 44×44px**, muy separados.
- [ ] Sin depender exclusivamente del color: siempre hay texto, icono o forma.
- [ ] Animación y sonido **desactivables**; nada de destellos ni parpadeos.
- [ ] Tiempo no forzado: ningún temporizador que expire la partida sin aviso claro.
- [ ] Mensajes de error en lenguaje llano: qué pasó y qué hacer. Sin códigos técnicos.
- [ ] Sin dark patterns (§6.4).
- [ ] **Zoom del navegador hasta 200% sin pérdida de contenido ni scroll horizontal**
      (requisito explícito de WCAG 2.2).
- [ ] **Objetivo táctil mínimo de 24×24px sin separación** (WCAG 2.2, criterio
      2.5.8). El nuestro es de 44×44px, muy por encima.
- [ ] Los mensajes del chat se anuncian de forma no intrusiva: no se secuestra
      el foco al llegar un mensaje nuevo (§2.3, polling).

### 4.2 Requisitos técnicos

- [ ] Navegación completa por teclado con foco siempre visible.
- [ ] HTML semántico: `button`, `label`, encabezados jerárquicos, `alt` en imágenes.
- [ ] Lectores de pantalla probados en cada pantalla nueva (VoiceOver / NVDA).
- [ ] Contraste de color **mínimo 4.5:1** en texto, 3:1 en bordes y controles.
- [ ] Preferencia `prefers-reduced-motion` respetada en todo el CSS.
- [ ] `lang="es"` en el documento; cada cadena de UI en un único diccionario.

### 4.3 Verificación

La accesibilidad se **prueba**, no se supone. Una pantalla no se da por válida
hasta que ha pasado el checklist de §4.1 y §4.2. Cualquier regresión en este
ámbito bloquea la entrega igual que un fallo de seguridad.

---

## 5. Estrategia de pruebas

Las pruebas son parte de la definición de "terminado", no un paso opcional.

| Nivel         | Qué cubre                                                          | Cuándo se exige                |
| ------------- | ------------------------------------------------------------------ | ------------------------------ |
| Unitaria      | Lógica de puntuación, validación, reglas de juego                  | Toda lógica de negocio         |
| Integración   | Endpoints + PostgreSQL, autenticación, validación de score         | Toda funcionalidad de servidor |
| Frontend      | Componentes, renderizado, estados de error                         | Todo componente reutilizable   |
| E2E           | Recorrido completo: registro → jugar → puntuar → ver clasificación | Cada flujo principal           |
| Accesibilidad | Checklist §4.1 y §4.2, auditoría automática                        | Toda pantalla nueva            |

**Las pruebas E2E y de accesibilidad usan Playwright.** Decidido.

Herramientas:

| Capa                  | Herramienta                                    |
| --------------------- | ---------------------------------------------- |
| Backend unitarias e integración | `pytest` + `httpx`                  |
| Frontend unitarias    | Vitest + React Testing Library                 |
| E2E y accesibilidad   | **Playwright**                                 |

Playwright es **obligatorio** en dos frentes, no solo como tests E2E:

- [ ] **Recorridos completos** en los tres dispositivos objetivo (§7).
- [ ] **Auditoría de accesibilidad** automática (axe-core sobre cada pantalla).
- [ ] **Tests de teclado**: navegación completa sin ratón (§4.2).

**Regla de oro:** una funcionalidad sin pruebas no está terminada. Si falta
tiempo, se reduce el alcance — nunca se elimina la prueba.

**Regla de oro específica:** **la puntuación nunca se prueba en el cliente.**
Siempre hay un test de integración que confirma que el servidor rechaza una
puntuación manipulada.

---

## 6. Seguridad, privacidad y ética

### 6.1 Reglas generales

1. **Autenticación y autorización en el servidor.** Nunca confiar en el cliente.
2. **Validación de entrada en el borde** de cada request. Nunca confiar en datos de entrada.
3. **Consultas parametrizadas.** Nunca concatenar strings para construir SQL.
4. **Secretos en variables de entorno.** Nunca en el repositorio, ni en un `.env` versionado.
5. **Transporte cifrado.** Nada sensible en tránsito sin HTTPS.

### 6.2 Contraseñas: hashear, no cifrar

Decisión de producto: **nombre de usuario + contraseña, sin correo y sin
verificación** (§2.2). El riesgo de esta decisión está asumido y documentado en
§6.3. Aun así, hay una distinción técnica que **no es negociable**:

> **Las contraseñas se guardan HASHEADAS, nunca cifradas.**
>
> "Cifrar" significa que se puede revertir con una clave. Si alguien accede a la
> base de datos, lee todas las contraseñas de todos los usuarios. Eso es
> exactamente lo que hay que evitar.
>
> "Hashear" (bcrypt, argon2 o scrypt) significa que **no hay forma de recuperar la
> contraseña**. Solo se puede comprobar si la que alguien teclea coincide con el
> hash guardado. Aunque alguien tenga la base de datos entera, no puede obtener
> las contraseñas.

Requisitos obligatorios:

- [ ] Contraseñas hasheadas con **argon2** o **bcrypt**. Nunca SHA-256, MD5 ni
      ningún hash simple.
- [ ] **Salt** por contraseña, generado automáticamente.
- [ ] Coste de cómputo alto (argon2id o bcrypt con factor ≥ 12).
- [ ] Longitud mínima de **8 caracteres**, sin exigir símbolos ni mayúsculas
      (§6.3: las reglas complejas empujan a usar patrones predecibles).
- [ ] En el registro, nunca se registra ni se escribe la contraseña en un log.
- [ ] El nombre de usuario se compara en mayúsculas/minúsculas de forma
      consistente, para no crear cuentas duplicadas por mayúscula.
- [ ] La contraseña **nunca viaja de vuelta** al cliente en ninguna respuesta.

> **Sobre no cifrar la base de datos:** si en el futuro el proyecto se despliega
> (§7.1), puede añadirse cifrado en reposo. Es distinto y complementario. Pero
> **nunca sustituye al hash**, porque no protege frente a una lectura de la tabla
> de usuarios.

### 6.3 Autenticación sin correo: riesgo asumido

Riesgos de no tener correo ni recuperación:

1. **Contraseña olvidada = cuenta perdida.** No hay forma de recuperarla. El
   usuario tiene que crear una cuenta nueva y perder su progreso.
2. **Suplantación.** Sin verificación por correo, cualquiera puede registrar el
   nombre de usuario de otro. Mitigación parcial: los nombres de usuario no se
   muestran públicamente en ningún sitio (§2.2).
3. **Sin protección contra spam y bots.** No hay correo de confirmación.

Mitigaciones:

- [ ] Contraseñas hasheadas (§6.4). Esto no se negocia.
- [ ] Límite de intentos de inicio de sesión para frenar ataques de fuerza bruta.
- [ ] Mensaje de error **genérico** ("usuario o contraseña incorrectos"): nunca
      revelar si el usuario existe, porque eso facilita el sondeo.
- [ ] Validación de robustez de la contraseña en el cliente, sin exigir
      complicación excesiva (§1.1): longitud mínima razonable y ninguna regla
      que fuerce símbolos absurdos.

### 6.4 Sin dark patterns y protección frente a manipulación

Nuestro usuario es vulnerable a estafas por su perfil. Por tanto:

- [ ] Ningún botón o enlace engañoso. La etiqueta dice exactamente qué va a pasar.
- [ ] Ninguna urgencia artificial, contador regresivo o presión para comprar.
- [ ] Sin publicidad, sin tracking de terceros, sin terceros que pidan permiso.
- [ ] Los mensajes del sistema se distinguen visualmente de los mensajes de usuarios.

### 6.5 Datos mínimos (RGPD / LOPD)

- [ ] Se guarda **solo** lo imprescindible: identificador, **alias anónimo**,
      puntuación, y lo que la partida requiera.
- [ ] **No hay nombres reales**, ni apellidos, ni dirección, ni teléfono, ni
      ubicación, ni foto, ni datos de salud. La identidad es un alias
      autogenerado (§2.2).
- [ ] El alias no es elegido por el usuario y no permite deducir datos personales.
- [ ] El chat se considera dato personal. Política de retención definida y
      aplicada: `[CHAT_RETENTION]`.
- [ ] Derecho a exportar y borrar los datos del usuario, implementado de verdad.

### 6.6 Anti-trampas

- [ ] El servidor valida cualquier puntuación recibida.
- [ ] Existen límites razonables: ninguna puntuación imposible se acepta.
- [ ] Un alias anónimo no puede usarse para ocultar una segunda cuenta: no hay
      verificación por correo (§6.3), así que el control es local y depende de
      no exponer los nombres de usuario.

### 6.7 Dependencias

- [ ] Cero vulnerabilidades conocidas altas en producción.
- [ ] Sin dependencias nuevas sin explicar necesidad, tamaño y mantenimiento.

### 6.8 Chat sin moderación — riesgo asumido

**Decisión tomada: el MVP no incluye moderación de chat.** Se documenta aquí el
riesgo porque es real y hay que asumirlo con conciencia.

Riesgos asumidos:

1. **Abuso y acoso.** Sin moderación, un usuario puede hostigar a otro de forma
   continua. En una población mayor, el usuario afectado puede no saber cómo
   defenderse ni a quién acudir.
2. **Suplantación.** Los alias son anónimos y autogenerados, lo que impide
   verificar quién es quién. Cualquiera puede comportarse como si fuera otro.
3. **Estafas y phishing.** Un usuario mayor es un objetivo activo. El chat es un
   vector natural para intentar pedirles enlaces o dinero.
4. **Contenido inapropiado.** Sin filtro, nada impide contenido sexual,
   ofensivo o ilegal.

**Mitigaciones en el MVP**, para que el riesgo sea aceptable:

- [ ] **Botón de bloquear** a otro usuario, visible y accesible (§4.1).
- [ ] Un usuario bloqueado **no puede** enviar mensajes al que le bloqueó.
- [ ] El bloqueo es **inmediato y sin** confirmación: un paso, no un diálogo
      con dos botones. Que el usuario afectado no sepa qué ha pasado es peor
      que un clic de más.
- [ ] El chat **no admite enlaces ni imágenes**: solo texto plano. Reduce
    sustancialmente el phishing y evita contenido oculto.
- [ ] Límite de longitud de mensaje para acotar el abuso.
- [ ] Los mensajes del sistema se distinguen visualmente de los de usuarios
      (§6.4), para que no haya suplantación del sistema.

**Sin botón de reportar.** Decisión consciente: sin moderadores, un reporte no
tiene a quién llegar, así que el botón solo generaría frustración. Se sustituye
por el bloqueo, que sí tiene efecto inmediato.

**Riesgo residual aceptado:** sin moderación ni reporte, el acoso continúa
mientras no se bloquee. Quien abuse puede ser bloqueado, y quien no se defiende
puede pedir ayuda a alguien de confianza fuera de la plataforma. Es un riesgo
aceptado para uso local (§7.1).

> Esto está registrado como deuda en §11: es una decisión consciente con
> consecuencias conocidas, no un olvido.

---

## 7. Rendimiento y calidad operativa

- El proyecto debe construir y ejecutar sus pruebas sin pasos manuales.
- Errores: se registran con contexto suficiente para diagnosticarlos, sin exponer
  detalles internos al usuario final.
- Todo estado que deba sobrevivir a un reinicio del servidor vive en PostgreSQL,
  no en memoria del proceso.

### 7.0 Entorno: local, sin despliegue

**El proyecto no se despliega. Vive en local.** Decidido.

Esto tiene consecuencias que hay que respetar:

- [ ] La aplicación se levanta **en la máquina del desarrollador** con un solo
      comando documentado (idealmente `docker compose up`).
- [ ] **No hay HTTPS** (§6.1 punto 5 se relaxa: el tráfico es local). Aun así,
      nunca se exponen fuera de `localhost`.
- [ ] **No hay escalado**, ni balanceo, ni alta disponibilidad. Un único proceso.
- [ ] El polling puede ser **más agresivo** que en producción (menos latencia
      aceptable) pero nunca tanto que degrade el uso.
- [ ] **No se requieren cuentas de cloud ni claves de servicios externos.** El
      proyecto debe arrancar sin ninguna credencial externa.

**Lo que esto NO permite:**

> **Nada de esto justifica rebajar la calidad.** El proyecto sigue siendo
> código real que puede ir a producción después:
>
> - Las contraseñas se **hashean** igual (§6.2). Guardarlas en texto plano
>   "porque es local" es la clase de decisión que luego cuesta migrar.
> - La **validación en el servidor** sigue siendo obligatoria (§6.1). Que solo
>   haya un usuario en la red no significa que el cliente pueda inventarse
>   puntuaciones.
> - Las **pruebas** siguen siendo obligatorias (§5).
> - La **accesibilidad** se cumple igual (§4). Es el núcleo del producto.
>
> "Es local" solo cambia el despliegue, nunca los estándares.

### 7.1 Dispositivos objetivo

El objetivo son **los tres**: ordenadores, tablets y móviles. **No hay un
dispositivo principal ni secundarios — los tres son de primera clase.**

| Dispositivo | Requisito |
|---|---|
| **Ordenador** | Ancho completo. Aprovechar el espacio sin agrandar elementos en exceso. |
| **Tablet** | Layout de una o dos columnas. Objetivos táctiles grandes (§4.1). |
| **Móvil** | Desde **360px**. Una columna. Teclado en pantalla no debe romper el juego. |

**Regla:** ninguna funcionalidad se implementa solo para escritorio y se "adapta"
después. Cada pantalla se diseña y se prueba en los tres.

- [ ] Sin scroll horizontal en ninguno de los tres.
- [ ] Playwright ejecuta los E2E en **los tres perfiles de dispositivo** (§5).
- [ ] El chat es usable en móvil: la caja de texto y el botón de enviar deben
      quedar accesibles **con el teclado abierto**.

---

## 8. Qué debe hacer un agente de IA

Esta sección es de cumplimiento obligatorio para asistentes y agentes que trabajen
en este repositorio.

### 8.1 Antes de actuar

- [ ] Leer esta constitución y `README.md` antes de tocar un archivo.
- [ ] Buscar código existente antes de crear algo nuevo. Reutilizar es la norma.
- [ ] Si el requerimiento es ambiguo, **preguntar**. No adivinar requisitos.
- [ ] No resolver un placeholder por su cuenta (§0.2).
- [ ] Si el cambio afecta a la accesibilidad (§4), tratarlo como requisito de
      primera clase, no como revisión posterior.

### 8.2 Al actuar

- [ ] Cambios mínimos y quirúrgicos: nada de refactors "de paso".
- [ ] No reescribir ni borrar trabajo existente del usuario sin confirmación.
- [ ] No dejar código deshabilitado, comentado ni en `TODO` sin justificación.
- [ ] Todo código nuevo viene acompañado de sus pruebas.
- [ ] No añadir dependencias nuevas sin explicar la necesidad y el coste.
- [ ] Toda cadena de texto visible en la UI va al diccionario (§4.2), nunca
      hardcodeada en un componente.

### 8.3 Al responder

- [ ] Describir qué se cambió y **por qué**, de forma concisa.
- [ ] Ser honesto sobre lo que no se hizo, lo que falló y lo que quedó pendiente.
- [ ] Si una regla de esta constitución se incumple, decirlo explícitamente.
- [ ] No afirmar que algo funciona sin haberlo ejecutado o verificado.
- [ ] Si un cambio afecta a mayores como usuarios, mencionar explícitamente cómo.

### 8.4 Prohibiciones

- [ ] No saltarse pruebas, linting ni verificación para "hacer que pase".
- [ ] No modificar configuración de CI/CD para que un build rojo aparezca verde.
- [ ] No incluir secretos, tokens ni datos reales de usuarios.
- [ ] No hacer commits, pushes ni despliegues sin autorización explícita.
- [ ] No reducir tamaño de fuente, contraste o tamaño de botón para "ganar espacio".

---

## 9. Control de cambios

Esta constitución cambia explícitamente, nunca por inercia.

1. Toda modificación requiere **motivo**, **alcance** y **qué principio afecta**.
2. Los cambios que relajen un principio (§1) requieren justificación escrita y
   revisión explícita. En particular, **relajar §1.1 está prohibido**.
3. La versión se incrementa (semver) y se actualiza la tabla de versiones (§10).
4. Todo el código existente se revisa contra la nueva versión en un plazo
   razonable; las desviaciones se registran como deuda técnica (§11).
5. Las specs afectadas se actualizan **antes** que el código (§0.3).

---

## 10. Registro de versiones

| Versión | Fecha      | Cambios                                                                                                          | Autor |
| ------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ----- |
| v0.1    | 2026-10-15 | Estructura inicial de la constitución                                                                            | —     |
| v0.2    | 2026-10-15 | Proyecto definido: juegos para mayores, React+Tailwind / FastAPI / PostgreSQL. Sección de accesibilidad y ética. | —     |
| v0.3    | 2026-10-15 | Catálogo de juegos v1 (Paraulógic, Wordle, Acertijo). Modelo de datos común con `GameId`, variantes diarias, requisitos por juego y comunes. | —     |
| v0.4    | 2026-10-15 | Contenido de juegos en PostgreSQL vía API. Idioma único: español. MVP con un único set por juego, sin rotación diaria. Especificación de Wordle (huecos + 3 pistas) y Acertijo (respuesta única, prima el razonamiento). Sistema de puntuación. | —     |
| v0.5    | 2026-10-15 | Nombre **Connect**. Paraulógic (todas las palabras, intentos ilimitados, botón de pista). Wordle una vez por jugador. WCAG 2.2 AA confirmado. Playwright. Chat por polling. Identidad anónima. Los tres dispositivos son objetivo de primera clase. Sección §6.8: riesgo del chat sin moderación. | —     |
| v0.6    | 2026-10-15 | Paraulógic: 1 punto por palabra, intentos infinitos, no se puede perder, pausa y reanudación (§2.1.7). Autenticación usuario+contraseña sin correo, contraseñas **hasheadas** (§6.2) y riesgos asumidos (§6.3). Chat: bloqueo sí, reporte no. Entorno **local sin despliegue** (§7.0). | —     |
| v0.7    | 2026-10-15 | Contenido del MVP definido y cargado en `data/seed_v0.sql` (§2.1.8): Wordle `LUNAS`, 1 acertijo, y Paraulógic con letras A E N R S T y 21 palabras. | —     |
| v0.8    | 2026-10-15 | Método **SDD spec-anchored** (§0.3, nueva): la spec es la fuente de verdad, requisitos numerados, una rama por spec. Frontend en **JavaScript** (§3.2), con el tipado fuerte concentrado en la frontera del servidor. | —     |
| v0.9    | 2026-10-16 | Placeholders de las specs 001-005 resueltos (§0.1): `pytest`+`httpx` (§5), contraseña mínima de 8 caracteres (§6.2), Wordle base 100 con −10 % por intento y Acertijo 10 puntos fijos (§2.1.5). Se añade `[ACERTIJO_POINTS]`, que faltaba en §0.2 y bloqueaba la tarea 5.13 de la spec 005. Ningún principio se relaja. | —     |

---

## 11. Deuda técnica conocida

Todo incumplimiento consciente de la constitución se registra aquí.

| #   | Incumplimiento                                   | Motivo                                              | Plan de resolución                                            | Prioridad |
| --- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------- | --------- |
| 1   | Chat sin moderación ni reporte (§6.8)            | Fuera de alcance del MVP                            | Mitigaciones: bloqueo, solo texto plano, sin enlaces. Moderación real en v2 | 🔴 Alta |
| 2   | Contenido de juegos público y fijo (§2.1.3)       | Es un MVP                                           | Set único asumido. Rotación por fecha en v2                   | 🟡 Media |
| 3   | Puntuación de Paraulógic trivial (§2.1.5)        | 1 punto por palabra, intentos infinitos, pistas gratis | Se revisa cuando haya más contenido o niveles               | 🟡 Media |
| 4   | Sin recuperación de contraseña (§6.3)             | Decisión de producto                                | Añadir correo cuando el proyecto salga de local               | 🟡 Media |
| 5   | Sin verificación de correo (§6.3)                 | Decisión de producto                                | Revisar si se despliega                                        | 🟡 Media |
| 6   | Sin HTTPS (§7.0)                                 | Solo local                                          | Obligatorio si se despliega. Nunca exponer fuera de localhost | 🟢 Baja |

> Una deuda sin plan de resolución no es deuda: es una excepción silenciosa.

---

## 12. Registro de decisiones

Cada placeholder resuelto se anotará aquí con su justificación.

| Fecha      | Decisión                                                    | Justificación                        |
| ---------- | ----------------------------------------------------------- | ------------------------------------ |
| 2026-10-15 | Nombre: **Connect**                                         | Definido por el equipo               |
| 2026-10-15 | Identidad **anónima** con alias autogenerado                 | Minimiza datos personales (§6.5)     |
| 2026-10-15 | Accesibilidad: **WCAG 2.2 AA**                               | Compromiso de conformidad           |
| 2026-10-15 | E2E y accesibilidad con **Playwright**                       | Herramienta estándar del sector     |
| 2026-10-15 | Chat por **polling**                                         | Simplicidad para el MVP              |
| 2026-10-15 | **Sin moderación** de chat en el MVP                        | Fuera de alcance; riesgo en §6.8     |
| 2026-10-15 | Wordle: **una partida por jugador**                          | Da sentido a la clasificación       |
| 2026-10-15 | Paraulógic: **sin límite de intentos**                      | Prioriza la calma sobre la presión  |
| 2026-10-15 | Ordenadores, tablets **y** móviles de primera clase         | Tres objetivos, ninguno secundario  |
| 2026-10-15 | Paraulógic: **1 punto por palabra**, intentos infinitos, no se puede perder | Sin frustración para el usuario    |
| 2026-10-15 | **Partida pausable y persistente** en todos los juegos       | El jugador puede volver cuando quiera |
| 2026-10-15 | Botón de **bloqueo** en el chat, **sin reporte**             | Sin moderadores, el reporte no sirve; el bloqueo sí |
| 2026-10-15 | Auth: **usuario + contraseña, sin correo**                   | Simple, sin servicios externos       |
| 2026-10-15 | Contraseñas **hasheadas**, nunca cifradas                   | Requisito técnico innegociable (§6.2) |
| 2026-10-15 | **Sin despliegue: local**                                   | Fase actual del proyecto (§7.0)      |
| 2026-10-15 | Frontend en **JavaScript** (no TypeScript)                 | Decisión del equipo (§3.2)            |
| 2026-10-15 | Método de desarrollo: **SDD spec-anchored**                | La spec es la fuente de verdad (§0.3) |
| 2026-10-15 | Una rama por spec: `feature/spec-NNN-<slug>`               | Trazabilidad requisito → código (§0.3) |
| 2026-10-16 | Pruebas backend con **`pytest` + `httpx`**                  | Estándar del sector; cubre unitarias e integración contra PostgreSQL real (§5) |
| 2026-10-16 | Contraseña mínima de **8 caracteres**, sin símbolos ni mayúsculas | Las reglas complejas empujan a patrones predecibles (§6.3) |
| 2026-10-16 | Wordle: **base 100, −10 % por intento**                    | Es la única puntuación con componente de eficiencia (§2.1.5) |
| 2026-10-16 | Acertijo: **10 puntos fijos** al acertar                   | Se premia el acierto, nunca la rapidez ni el número de intentos (§2.1.5) |
| 2026-10-16 | commits y ramas **autorizados explícitamente por el equipo** | La constitución exige autorización explícita para commitear (§8.4) |
