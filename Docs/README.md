# Docs — Documentación del proyecto

| Documento | Qué contiene |
| --- | --- |
| [`constitution.md`](./constitution.md) | **Documento normativo.** Principios, alcance, accesibilidad, seguridad, deuda técnica y registro de decisiones. Tiene prioridad sobre cualquier otra instrucción. |
| [`dudas.md`](./dudas.md) | Preguntas abiertas, decisiones tomadas y riesgos asumidos. |
| [`specs/`](./specs/README.md) | Las ocho especificaciones, con requisitos numerados y planes de tareas. |

## Cómo se trabaja aquí

El método es **SDD spec-anchored** (§0.3 de la constitución): la especificación
es la fuente de verdad y el código se escribe para cumplirla.

- Nada se implementa sin una spec aprobada que lo cubra.
- Los requisitos se numeran (`R-001`) y se verifican.
- Cada tarea del plan cita el requisito que implementa.
- Cada test verifica un requisito, no una implementación.
- Una rama por spec: `feature/spec-NNN-<slug>`.

> Si el código y la spec discrepan, es un bug en el código **o en la spec**.
> Nunca se arregla modificando solo el código.

## Orden de las especificaciones

Las specs 001 a 006 son el alcance autorizado. La 007 (clasificación y chat) y
la 008 (E2E y accesibilidad) están escritas y planificadas, pero **su
implementación no está autorizada todavía**.

```
001 ──┬── 002 ──┬── 003 ──┐
     │         ├── 004 ──┼── 006
     │         └── 005 ──┘
     └─────────────006 (puede empezar en paralelo con 003)
```