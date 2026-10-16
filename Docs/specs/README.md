# Especificaciones — Connect

Especificaciones del proyecto bajo el método **SDD spec-anchored** (§0.3 de
[`constitution.md`](../constitution.md)).

> **La spec es la fuente de verdad.** Si el código y la spec discrepan, es un
> bug en el código o un bug en la spec. Nunca se arregla solo cambiando el
> código.

## Qué hay en cada carpeta

```
NNN-nombre/
  spec.md   → QUÉ se construye. Requisitos numerados (R-001) y verificables.
  plan.md   → CÓMO se construye. Tareas numeradas (N.N) con las casillas para
              llevar el seguimiento de lo implementado.
```

## Reglas de trabajo

1. **Nada se implementa sin spec aprobada** que lo cubra.
2. Cada tarea del plan **cita el requisito** que implementa.
3. Cada test **verifica un requisito**, no una implementación.
4. Cambiar un requisito: **primero la spec, luego el código**.
5. **Una rama por spec**: `feature/spec-NNN-<slug>`.
6. Una spec **no está terminada** hasta que sus tareas estén marcadas y sus
   criterios de aceptación satisfechos.

## Especificaciones

| Spec | Nombre | Cubre | Estado |
| ---- | ------ | ----- | ------ |
| [001](001-entorno-local/) | Entorno local | `docker compose`, esqueletos FastAPI y Vite, git | Implementada |
| [002](002-esquema-datos/) | Esquema de datos | Modelos, Alembic, carga del seed, test de integridad | Pendiente |
| [003](003-autenticacion/) | Autenticación | argon2id, registro, login, sesiones, alias anónimo | Pendiente |
| [004](004-api-contenido/) | API de contenido | Endpoints de los tres juegos, pistas, validación | Pendiente |
| [005](005-persistencia-partidas/) | Persistencia de partidas | Guardado y restauración de progreso, puntuación | Pendiente |
| [006](006-frontend-accesible/) | Frontend accesible | Tokens de diseño, navegación por teclado, diccionario | Pendiente |
| [007](007-clasificacion-y-chat/) | Clasificación y chat | Leaderboard, chat por polling, bloqueo | No implementada |
| [008](008-e2e-y-accesibilidad/) | E2E y accesibilidad | Playwright en tres dispositivos, auditoría WCAG | No implementada |

**Alcance de la implementación actual: specs 001 a 006** (fases 1 a 5).
Las specs 007 y 008 están escritas y planificadas, pero su implementación
no está autorizada todavía.

## Dependencias

```
001 ──┬── 002 ──┬── 003 ──┐
     │         ├── 004 ──┼── 006
     │         └── 005 ──┘
     └─────────────006 (puede empezar en paralelo con 003)
```

## Trazabilidad requisito → código

Cada requisito vive en el repositorio y se referencia desde el commit que lo
implementa. Formato del pie de commit:

```
Refs: Docs/specs/003-autenticacion/spec.md#R-004
```