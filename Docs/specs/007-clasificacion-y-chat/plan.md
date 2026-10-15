# Plan — Spec 007: Clasificación y chat

**Estado:** planificada — **no implementada**
**Progreso:** 0/14 tareas
**Rama:** `feature/spec-007-clasificacion-y-chat`
**Spec:** [`spec.md`](./spec.md)

> ⛔ **La implementación de esta spec no está autorizada.** Está escrita para
> que exista el plan cuando llegue el momento.

## Tareas

### R-001 y R-002 — Clasificación

- [ ] 7.1 Implementar `GET /api/leaderboard` accesible sin sesión, con
      ordenación y paginación.
      → *R-001*, *R-002*
- [ ] 7.2 Verificar que la respuesta **nunca incluye `username`**.
      → *R-001*
- [ ] 7.3 Vista de clasificación global y por juego, con alias, puntos y
      juego.
      → *R-001*

### R-003 — Chat por polling

- [ ] 7.4 Implementar `GET /api/chat/messages` con filtro por marca de tiempo.
      → *R-003*
- [ ] 7.5 Implementar `POST /api/chat/messages`.
      → *R-003*
- [ ] 7.6 Polling en el cliente que se **detiene con la pestaña oculta**.
      → *R-003*
- [ ] 7.7 Al llegar un mensaje nuevo, no mover el foco ni hacer scroll brusco.
      → *R-003*

### R-004 — Mensajes en texto plano

- [ ] 7.8 Escapar siempre el texto en el renderizado.
      → *R-004*
- [ ] 7.9 Rechazar enlaces e imágenes en el servidor, no solo ocultarlos en la
      interfaz.
      → *R-004*
- [ ] 7.10 Aplicar el límite de longitud por mensaje.
      → *R-004*

### R-005 y R-006 — Alias y bloqueo

- [ ] 7.11 Mostrar solo el alias en cada mensaje.
      → *R-005*
- [ ] 7.12 Implementar `POST /api/users/{id}/block` y `unblock`.
      → *R-006*
- [ ] 7.13 Impedir que un bloqueado escriba al que le bloqueó.
      → *R-006*
- [ ] 7.14 Botón de bloqueo de un solo paso, visible y accesible.
      → *R-006*

### R-007 a R-009 — Ausencia de moderación y privacidad

- [ ] 7.15 Confirmar que **no existe** ningún endpoint ni botón de reporte.
      → *R-007*
- [ ] 7.16 Distinguir visualmente los mensajes del sistema.
      → *R-007*
- [ ] 7.17 Implementar el borrado automático de mensajes a los
      `[CHAT_RETENTION]` días.
      → *R-008*
- [ ] 7.18 Verificar que no se registra la IP y que el chat exige sesión.
      → *R-009*

## Verificación de la spec

- [ ] V.1 La clasificación funciona sin sesión.
- [ ] V.2 No aparece ningún `username`.
- [ ] V.3 Solo alias, puntuación y juego.
- [ ] V.4 El bloqueo impide escribir.
- [ ] V.5 Bloquear es un solo paso.
- [ ] V.6 El HTML se muestra literal.
- [ ] V.7 No se admiten enlaces ni imágenes.
- [ ] V.8 El polling se pausa con la pestaña oculta.
- [ ] V.9 Los mensajes nuevos no secuestran el foco.
- [ ] V.10 No hay botón de reportar.
- [ ] V.11 Los mensajes se borran por antigüedad.
- [ ] V.12 El chat exige sesión.

## Notas

- Esta spec **no reduce el riesgo** del chat sin moderación, solo lo contiene.
  El riesgo sigue registrado como deuda técnica (§11, fila 1) y hay que
  revisarlo si el proyecto se despliega alguna vez.
- La restricción de texto plano (R-004) se aplica **en el servidor**. Ocultarla
  solo en la interfaz dejaría el problema abierto para quien llame a la API
  directamente.
- `[CHAT_RETENTION]` y `[POLL_INTERVAL]` siguen sin confirmar en §0.2.
- Al empezar esta spec, hay que **actualizar el índice** de `Docs/specs/README.md`
  a partir de aquí.