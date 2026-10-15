# Connect

> Plataforma web de juegos de palabras con comunidad, diseñada para personas
> mayores de 60 años y con necesidades de accesibilidad.

**Connect** no es un sitio de juegos: es un sitio para pensar acompañado. Los
juegos son sencillos y sin prisas, pero lo que mantiene a la gente en la
plataforma es ver la puntuación del resto, chatear y tener compañía.

---

## 🎯 Qué es

Un MVP de tres juegos de lógica y palabras, jugados desde el navegador, sin
límite de tiempo y sin necesidad de precisión motora fina:

| Juego | Tipo | Cómo se juega |
| --- | --- | --- |
| **Paraulógic** | Deducción de palabras | Un conjunto de letras forma varias palabras ocultas. Hay que encontrarlas **todas**. |
| **Wordle** | Deducción de letras | Palabra de 5 letras, 6 intentos, tres pistas por letra. **Una partida por jugador.** |
| **Acertijo** | Pregunta con respuesta | Enunciado con una única respuesta correcta. Se puntúa el acierto, no la rapidez. |

Decisiones de producto que definen el proyecto:

- **No se puede perder** en Paraulógic: intentos infinitos y ningún estado de
  derrota. La frustración de perder es peor que una clasificación poco
  informativa.
- **La partida es pausable**: se puede salir y volver cuando quieras sin perder
  progreso. El estado vive en PostgreSQL, nunca en el navegador.
- **La identidad es anónima**: cada usuario recibe un alias autogenerado
  (`LoboTranquilo`). No hay nombres reales, ni avatares, ni fotos.
- **El contenido de los juegos vive en la base de datos** y se sirve por la API.
  En el cliente no hay ni una palabra escrita a mano.
- **Se premia haber acertado, nunca la rapidez.** No se penaliza el tiempo en
  ningún juego.

---

## 🧰 Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React + Tailwind CSS (**JavaScript**, sin TypeScript) |
| API / Backend | FastAPI (Python) |
| Base de datos | PostgreSQL |
| Entorno | Docker Compose, **local sin despliegue** |
| Pruebas E2E y accesibilidad | Playwright |
| Pruebas unitarias | `pytest` + Vitest + React Testing Library |

Código en inglés, interfaz y documentación en español, contenido de juegos
solo en español.

---

## ♿ Accesibilidad

La accesibilidad no es un extra: **es el producto**. El objetivo de conformidad
es **WCAG 2.2 nivel AA**, más tres mínimos que fijan la constitución porque son
los problemas típicos del usuario objetivo:

- Fuente base de **16 px**, ampliable hasta el **200 %**.
- Objetivos táctiles de **44 × 44 px**, muy separados.
- Contraste de **4.5:1** en texto.

Además:

- Ninguna pista depende **solo del color**: siempre hay texto e icono.
- Navegación completa **por teclado**, con foco siempre visible.
- Sin destellos, sin parpadeos, sin tiempo forzado.
- Sin scroll horizontal ni pérdida de contenido con el navegador al 200 %.
- La accesibilidad **se prueba**, no se supone: checklist por pantalla y
  auditoría automática con axe-core sobre cada pantalla nueva.

Ordenadores, tablets y móviles son **objetivo de primera clase**: ninguno es
secundario. Cada pantalla se diseña y se prueba en los tres.

---

## 🔒 Seguridad, privacidad y ética

Pensado desde el principio para un usuario vulnerable a estafas:

- Contraseñas **hasheadas** con argon2id y salt. Nunca cifradas, nunca en texto
  plano. Que el entorno sea local no baja este estándar.
- **Datos mínimos**: identificador, alias anónimo y puntuación. Nada de datos
  personales reales.
- **Sin dark patterns**: ninguna etiqueta engañosa, ninguna urgencia artificial,
  sin publicidad ni tracking de terceros.
- **Anti-trampas**: el servidor valida y calcula cualquier puntuación. El cliente
  propone, el servidor decide.
- Chat solo de **texto plano, sin enlaces ni imágenes**, para reducir phishing.
- El chat del MVP **no tiene moderación**: hay botón de bloqueo, que sí tiene
  efecto inmediato. Es un riesgo asumido y documentado, no un olvido.

El riesgo asumido está escrito en la constitución (§6.8) y registrado como deuda
técnica, no escondido.

---

## 📐 Método de desarrollo: SDD spec-anchored

Este proyecto sigue un método **spec-anchored**: la especificación es la fuente
de verdad y el código se escribe para cumplirla.

- Nada se implementa sin una spec aprobada que lo cubra.
- Los requisitos se **numeran** (`R-001`) y se **verifican**: o hay un criterio
  comprobable, o no es un requisito.
- Cada test verifica un requisito, no una implementación.
- **Una rama por spec**: `feature/spec-NNN-<slug>`.
- Si el código y la spec discrepan, es un bug en el código o en la spec. Nunca
  se arregla modificando solo el código.

> **La spec se revisa, se acepta o se corrige; y solo entonces el código la sigue.**

La [`Docs/constitution.md`](Docs/constitution.md) es el documento normativo del
proyecto: define principios, límites y reglas de trabajo, y tiene prioridad sobre
cualquier otra instrucción.

### Especificaciones

| Spec | Nombre | Cubre | Estado |
| --- | --- | --- | --- |
| [001](Docs/specs/001-entorno-local/) | Entorno local | `docker compose`, esqueletos FastAPI y Vite, git | Pendiente |
| [002](Docs/specs/002-esquema-datos/) | Esquema de datos | Modelos, Alembic, carga del seed, test de integridad | Pendiente |
| [003](Docs/specs/003-autenticacion/) | Autenticación | argon2id, registro, login, sesiones, alias anónimo | Pendiente |
| [004](Docs/specs/004-api-contenido/) | API de contenido | Endpoints de los tres juegos, pistas, validación | Pendiente |
| [005](Docs/specs/005-persistencia-partidas/) | Persistencia de partidas | Guardado y restauración de progreso, puntuación | Pendiente |
| [006](Docs/specs/006-frontend-accesible/) | Frontend accesible | Tokens de diseño, navegación por teclado, diccionario | Pendiente |
| [007](Docs/specs/007-clasificacion-y-chat/) | Clasificación y chat | Leaderboard, chat por polling, bloqueo | No autorizada |
| [008](Docs/specs/008-e2e-y-accesibilidad/) | E2E y accesibilidad | Playwright en tres dispositivos, auditoría WCAG | No autorizada |

---

## 📂 Estructura

```
.
├── backend/              # FastAPI — API, validación y puntuación
├── frontend/             # React + Tailwind — interfaz y mecánica de juego
├── data/
│   └── seed_v0.sql       # Contenido de los juegos (LUNAS, acertijo, 21 palabras)
└── Docs/
    ├── constitution.md   # Documento normativo del proyecto
    ├── dudas.md           # Preguntas abiertas y decisiones tomadas
    └── specs/            # Especificaciones 001 a 008
```

`backend/` y `frontend/` se crean en la spec 001. La estructura de carpetas
estable está definida en [`spec 001 · R-007`](Docs/specs/001-entorno-local/spec.md).

---

## 🚀 Puesta en marcha

> **Estado actual: fase de especificación.** El repositorio contiene la
> constitución, las ocho especificaciones con sus planes de tareas y el seed del
> contenido de los juegos. El código empieza con la spec 001.

```bash
git clone <url-del-repositorio> Connect
cd Connect
docker compose up
```

Levantará PostgreSQL, la API y el frontend. El arranque detallado paso a paso se
documentará en la spec 001 (`R-006`) y en los `README.md` de cada carpeta.

Requisitos: Docker y Docker Compose. **Ninguna credencial externa es necesaria.**

---

## 📚 Documentación

| Documento | Qué contiene |
| --- | --- |
| [`Docs/constitution.md`](Docs/constitution.md) | Principios, alcance, seguridad, deuda técnica y registro de decisiones. **Normativo.** |
| [`Docs/specs/`](Docs/specs/README.md) | Especificaciones numeradas, con requisitos y planes de tareas. |
| [`Docs/dudas.md`](Docs/dudas.md) | Preguntas abiertas, decisiones tomadas y riesgos asumidos. |
| [`data/seed_v0.sql`](data/seed_v0.sql) | Contenido del MVP: 1 palabra de Wordle, 1 acertijo y 21 palabras de Paraulógic. |

---

## ⚠️ Riesgos asumidos

Un MVP con cuatro decisiones de riesgo asumido, todas registradas como deuda
técnica en [`constitution.md` §11](Docs/constitution.md#11-deuda-técnica-conocida):

| Decisión | Riesgo | Plan |
| --- | --- | --- |
| Chat sin moderación ni reporte | Acoso y scams sin intervención | Mitigaciones: bloqueo, texto plano, sin enlaces. Moderación real en v2 |
| Contenido de juegos público y fijo | Se puede descubrir la solución | Rotación por fecha en v2 |
| Puntuación de Paraulógic trivial | Mide quién juega más, no habilidad | Se revisa con más contenido o niveles |
| Sin recuperación de contraseña | Olvidar la contraseña es perder la cuenta | Añadir correo cuando el proyecto salga de local |

> Una deuda sin plan de resolución no es deuda: es una excepción silenciosa.

---

## 📄 Licencia

Por definir. Ver `LICENSE` cuando se añada.
