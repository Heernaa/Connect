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
| [002](002-esquema-datos/) | Esquema de datos | Modelos, Alembic, carga del seed, test de integridad | **Implementada** |
| [003](003-autenticacion/) | Autenticación | argon2id, registro, login, sesiones, alias anónimo | **Implementada** |
| [004](004-api-contenido/) | API de contenido | Endpoints de los tres juegos, pistas, validación | **Implementada** |
| [005](005-persistencia-partidas/) | Persistencia de partidas | Guardado y restauración de progreso, puntuación | **Implementada** |
| [006](006-frontend-accesible/) | Frontend accesible | Tokens de diseño, teclado, diccionario y **los tres juegos** | **Implementada** |
| [007](007-clasificacion-y-chat/) | Clasificación y chat | Leaderboard, chat por polling, bloqueo | **Implementada** |
| [008](008-e2e-y-accesibilidad/) | E2E y accesibilidad | Playwright en tres dispositivos, auditoría WCAG | Planificada |

**Estado: specs 001 a 007 implementadas. La 008 está planificada.**

La 006 se amplió el 2026-10-16 para incluir **las pantallas de los tres juegos**
(R-014 a R-020). Antes las dejaba fuera remitiendo a «specs de la fase 6» que
nunca se escribieron, y su consecuencia fue una API de juegos completa sin
ninguna pantalla donde jugar. La ampliación trae también dos requisitos que la
constitución exigía y que ninguna spec tenía: el botón «Saltar partida» (§2.1.6)
y el reporte de respuesta correcta rechazada (§2.1.4).

Con eso, **la 008 ya no está bloqueada**: sus recorridos por juego y su auditoría
de todas las pantallas tienen, por fin, algo que medir.

### Qué hereda la siguiente spec

- **Chat:** 90 días de retención, polling de 10 s, 500 caracteres por mensaje,
  solo texto plano.
- **Bloqueo:** un paso, sin confirmación, en las dos direcciones.
- **Borrado de cuenta:** `DELETE /api/auth/me`. La **exportación** no existe
  (§11, fila 7).

La 006 añade además el sistema de diseño documentado en
[`sistema-diseno.md`](../sistema-diseno.md), del que heredan las pantallas de los
tres juegos: tokens de color, radios y tipografía derivados del diseño de Figma
y adaptados a WCAG 2.2 AA, con el contraste medido y comprobado por test.

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