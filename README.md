# Connect

> Plataforma web de juegos de palabras con comunidad, diseñada para personas
> mayores de 60 años y con necesidades de accesibilidad.

**Connect** no es un sitio de juegos: es un sitio para pensar acompañado. Los
juegos son sencillos y sin prisas, pero lo que mantiene a la gente en la
plataforma es ver la puntuación del resto, chatear y tener compañía.

## 👥 Grupo

- **Identificador del proyecto/grupo:** Connect. No consta un identificador
  numérico asignado al grupo.
- **Integrantes:** Ricard Martinez, Daniel Ivina, Noe Iniesta y Pol Hernandez.

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
| Lenguaje visual | Tokens derivados del diseño de Figma, adaptados a WCAG 2.2 AA ([`Docs/sistema-diseno.md`](Docs/sistema-diseno.md)) |

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
- La accesibilidad **se prueba**, no se supone: auditoría automática con axe-core
  sobre cada pantalla en ordenador, tablet y móvil, y revisión manual con
  [`checklist-accesibilidad.md`](Docs/checklist-accesibilidad.md), firmado y
  fechado (§4.3).

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
  El rechazo ocurre en el **servidor**: si solo se ocultara en la interfaz,
  quien llame a la API directamente podría seguir escribiéndolos.
- El chat del MVP **no tiene moderación**: hay botón de bloqueo, que sí tiene
  efecto inmediato. Es un riesgo asumido y documentado, no un olvido.
- Los mensajes se borran a los **90 días**, y el alias no revela nada de la
  persona que hay detrás.

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
| [001](Docs/specs/001-entorno-local/) | Entorno local | `docker compose`, esqueletos FastAPI y Vite, git | **Implementada** |
| [002](Docs/specs/002-esquema-datos/) | Esquema de datos | Modelos, Alembic, carga del seed, test de integridad | **Implementada** |
| [003](Docs/specs/003-autenticacion/) | Autenticación | argon2id, registro, login, sesiones, alias anónimo | **Implementada** |
| [004](Docs/specs/004-api-contenido/) | API de contenido | Endpoints de los tres juegos, pistas, validación | **Implementada** |
| [005](Docs/specs/005-persistencia-partidas/) | Persistencia de partidas | Guardado y restauración de progreso, puntuación | **Implementada** |
| [006](Docs/specs/006-frontend-accesible/) | Frontend accesible | Tokens de diseño, teclado, diccionario y **los tres juegos** | **Implementada** |
| [007](Docs/specs/007-clasificacion-y-chat/) | Clasificación y chat | Leaderboard, chat por polling, bloqueo | **Implementada** |
| [008](Docs/specs/008-e2e-y-accesibilidad/) | E2E y accesibilidad | Playwright en tres dispositivos, auditoría WCAG | Planificada |

---

## 📂 Estructura

```
.
├── backend/              # FastAPI — API, validación y puntuación
├── frontend/             # React + Tailwind — interfaz y mecánica de juego
├── data/
│   └── seed_v0.sql       # Contenido de los juegos (LUNAS, acertijo, 57 respuestas)
└── Docs/
    ├── constitution.md   # Documento normativo del proyecto
    ├── dudas.md           # Preguntas abiertas y decisiones tomadas
    └── specs/            # Especificaciones 001 a 008
```

`backend/` y `frontend/` se crean en la spec 001. Cada carpeta tiene su propio
`README.md` con su propósito, y no se crea código fuera de ellas sin
justificarlo (`spec 001 · R-007`).

---

## 🚀 Puesta en marcha

> **Estado actual: specs 001 a 007 implementadas.** El proyecto arranca con un
> solo comando y está **jugable de principio a fin**: los tres juegos con su
> interfaz, la API que valida y puntúa en el servidor, la parte social
> (clasificación, chat, bloqueo) y el sistema de diseño accesible del que todo lo
> demás hereda.
>
> La **spec 008** —recorridos E2E contra el backend real y auditoría en los tres
> dispositivos— está implementada salvo el checklist manual de accesibilidad, que
> tiene que firmarlo una persona ([`Docs/checklist-accesibilidad.md`](Docs/checklist-accesibilidad.md),
> §4.3).

**Requisitos previos:** Git y Docker Engine con Docker Compose v2 (`docker
compose`). Se recomienda disponer de conexión a Internet la primera vez para
descargar las imágenes de Docker y dependencias. No hace falta instalar Python,
Node.js ni PostgreSQL en el equipo anfitrión, ni disponer de credenciales
externas (§7.0). El proyecto se ejecuta en local y no se despliega.

```bash
git clone <url-del-repositorio> Connect
cd Connect
docker compose up --build
```

Eso levanta los tres servicios:

| Servicio | Dirección | Qué es |
| --- | --- | --- |
| `frontend` | <http://localhost:5173> | La interfaz |
| `backend` | <http://localhost:8000> | La API. Documentación interactiva en `/docs` |
| `db` | `localhost:5432` | PostgreSQL 17 |

La primera vez tarda unos minutos porque construye las imágenes. Después,
`docker compose up` ya arranca en segundos.

### Base de datos: migraciones y contenido

```bash
docker compose exec backend alembic upgrade head    # Crea o actualiza el esquema
docker compose exec db psql -U connect -d connect < data/seed_v0.sql   # Carga el contenido
```

El seed se puede ejecutar las veces que haga falta: no duplica nada.

Este archivo carga **datos ficticios de contenido de los juegos**, no cuentas
de demostración: una palabra de Wordle (`LUNAS`), un acertijo y 57 respuestas
de Paraulógic. Para dejar la base de datos preparada desde cero, con los
servicios ya iniciados, ejecuta:

```bash
docker compose exec backend alembic upgrade head
docker compose exec -T db psql -U connect -d connect < data/seed_v0.sql
```

El script es idempotente y puede volver a ejecutarse sin duplicar el contenido.
Las cuentas de usuario se crean desde la interfaz mediante **Crear cuenta**;
no se incluyen usuarios ficticios ni contraseñas compartidas.

### Pruebas

**Toda la suite con un comando**, con el stack levantado (spec 008 · R-009):

```bash
./scripts/test-all.sh
```

Ejecuta, en orden: `ruff` y `pytest` del backend (unitarias e integración contra
el PostgreSQL del stack), `oxlint` y `vitest` del frontend, `playwright` —E2E y
accesibilidad en **ordenador, tablet y móvil**— y la compilación de producción.
Todo dentro de los contenedores, para depender solo de Docker (§7.0).

Una violación de accesibilidad con `axe-core` rompe la suite igual que un fallo
funcional. Los recorridos de `frontend/e2e/journeys/` usan la aplicación real: si
el backend no está en marcha, fallan diciéndolo.

Por partes:

```bash
docker compose exec backend pytest              # Pruebas del backend
docker compose exec backend ruff check .       # Linter del backend
docker compose exec frontend npm test          # Unitarias del frontend (Vitest)
docker compose exec frontend npm run test:e2e  # E2E y accesibilidad, 3 dispositivos
docker compose exec frontend npm run build     # Compila el frontend
```

La revisión manual de accesibilidad es obligatoria y aparte: está en
[`Docs/checklist-accesibilidad.md`](Docs/checklist-accesibilidad.md) (§4.3).

### Configuración

No hace falta crear ningún `.env`: `docker compose` ya inyecta los valores de
desarrollo. Si quieres cambiarlos, copia [`.env.example`](.env.example) a
`.env`, que **nunca** se versiona (§6.1).

En producción, `SECRET_KEY` es obligatoria y el backend **se niega a arrancar**
si falta o si se deja la de desarrollo. Un despliegue inseguro que arranca en
silencio es peor que uno que se niega a arrancar.

### Parar y limpiar

```bash
docker compose down      # Para los servicios, conserva los datos
docker compose down -v   # Para y borra también el volumen de PostgreSQL
```

> `down -v` **borra la base de datos**, con todo su contenido. En el entorno
> local el contenido se recupera volviendo a cargar el seed (§2.1.3).

---

## 📚 Documentación

La documentación versionada está en [`Docs/`](Docs/README.md) y se puede
consultar desde el repositorio del proyecto.

- **Prototipo de Figma:** [Abuelos](https://www.figma.com/design/QCSNtnC9MKocVP36jPhDxi/Abuelos?node-id=58-183&p=f&t=aiMBIqLb7SYhSXBr-0).

Antes de entregar, sustituid estos dos pendientes por sus enlaces y configurad
ambos recursos para que cualquier persona con el enlace pueda verlos (solo
lectura), incluido el profesorado. Los documentos y el prototipo deben estar
alojados en un servicio accesible externamente; las rutas locales de este
repositorio solo son accesibles a quienes tengan el proyecto.

| Documento | Qué contiene |
| --- | --- |
| [`Docs/constitution.md`](Docs/constitution.md) | Principios, alcance, seguridad, deuda técnica y registro de decisiones. **Normativo.** |
| [`Docs/specs/`](Docs/specs/README.md) | Especificaciones numeradas, con requisitos y planes de tareas. |
| [`Docs/dudas.md`](Docs/dudas.md) | Preguntas abiertas, decisiones tomadas y riesgos asumidos. |
| [`data/seed_v0.sql`](data/seed_v0.sql) | Contenido del MVP: 1 palabra de Wordle, 1 acertijo y 57 respuestas de Paraulógic. |

---

## ⚠️ Riesgos asumidos

Un MVP con seis decisiones de riesgo asumido, todas registradas como deuda
técnica en [`constitution.md` §11](Docs/constitution.md#11-deuda-técnica-conocida):

| Decisión | Riesgo | Plan |
| --- | --- | --- |
| Chat sin moderación ni reporte | Acoso y scams sin intervención | Mitigaciones: bloqueo, texto plano, sin enlaces. Moderación real en v2 |
| Contenido de juegos público y fijo | Se puede descubrir la solución | Rotación por fecha en v2 |
| Puntuación de Paraulógic trivial | Mide quién juega más, no habilidad | Se revisa con más contenido o niveles |
| Sin recuperación de contraseña | Olvidar la contraseña es perder la cuenta | Añadir correo cuando el proyecto salga de local |
| Sin exportación de datos | Se puede borrar, pero no llevarse una copia | Endpoint de exportación en una spec posterior |
| Reportes de acertijo sin revisar | Una respuesta correcta rechazada no se corrige sola | Alguien revisa los casos y ajusta la normalización |

> Una deuda sin plan de resolución no es deuda: es una excepción silenciosa.

---

## 📄 Licencia

Por definir. Ver `LICENSE` cuando se añada.
