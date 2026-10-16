# Plan — Spec 007: Clasificación y chat

**Estado:** implementada
**Progreso:** 20/20 tareas
**Rama:** `feature/spec-007-clasificacion-y-chat`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 y R-002 — Clasificación

- [x] 7.1 Implementar `GET /api/leaderboard` accesible sin sesión, con
      ordenación y paginación.
      → *R-001*, *R-002* — `routers/leaderboard.py`. El total sale de un `SUM`
      en PostgreSQL, no de memoria del proceso (§2.4). `limit` con tope de 100 y
      `offset`, y `has_more` lo calcula el servidor para no acertar en el borde.
- [x] 7.2 Verificar que la respuesta **nunca incluye `username`**.
      → *R-001* — `schemas/social.py::LeaderboardEntry` no declara el campo, así
      que no hay forma de devolverlo por descuido. `tests/test_leaderboard.py` lo
      busca en el cuerpo **entero**, no en una clave.
- [x] 7.3 Vista de clasificación global y por juego, con alias, puntos y
      juego.
      → *R-001* — `pages/LeaderboardPage.jsx`. Filtro con `fieldset` y radios, no
      con un `select`: un desplegable esconde las opciones y con teclado hay que
      saber que está ahí.

### R-003 — Chat por polling

- [x] 7.4 Implementar `GET /api/chat/messages` con filtro por marca de tiempo.
      → *R-003* — `since` en ISO 8601. Devuelve `poll_from` con cada respuesta,
      incluso sin mensajes nuevos: si no avanzara, el cliente volvería a preguntar
      siempre por el mismo instante.
- [x] 7.5 Implementar `POST /api/chat/messages`.
      → *R-003*
- [x] 7.6 Polling en el cliente que se **detiene con la pestaña oculta**.
      → *R-003* — `hooks/useChatPolling.js`. `setInterval` de 10 s saltándose el
      tick cuando `visibilityState` es `hidden`, y `visibilitychange` consultando
      **en el acto** al volver. `useChatPolling.test.js` mide el reloj.
- [x] 7.7 Al llegar un mensaje nuevo, no mover el foco ni hacer scroll brusco.
      → *R-003* — el hook no toca el DOM. La pantalla recuerda si quien leía
      estaba al final (`ChatPage.jsx`) y solo entonces baja; si estaba más arriba
      aparece un botón «Ver los mensajes nuevos». `e2e/social.spec.js` comprueba
      que el foco sigue dentro del campo mientras se escribe.

### R-004 — Mensajes en texto plano

- [x] 7.8 Escapar siempre el texto en el renderizado.
      → *R-004* — React escapa al pintar. `tests/test_chat.py` comprueba que
      `<b>` vuelve como texto.
- [x] 7.9 Rechazar enlaces e imágenes en el servidor, no solo ocultarlos en la
      interfaz.
      → *R-004* — `services/chat_text.py`, aplicado en `ChatMessageRequest` con
      mensajes en llano. 25 casos en `test_chat_text.py`, incluidos los que
      tienen que **dejarse pasar**: un filtro que bloquea `2+2=4` o
      `E=mc2` acabaría haciendo que nadie escriba.
- [x] 7.10 Aplicar el límite de longitud por mensaje.
      → *R-004* — 500 caracteres, comprobados en los dos bordes.

### R-005 y R-006 — Alias y bloqueo

- [x] 7.11 Mostrar solo el alias en cada mensaje.
      → *R-005*
- [x] 7.12 Implementar `POST /api/users/{id}/block` y `unblock`.
      → *R-006* — `204` sin cuerpo en los dos.
- [x] 7.13 Impedir que un bloqueado escriba al que le bloqueó.
      → *R-006* — el chat es una conversación única y pública: si alguien te ha
      bloqueado, cualquier texto tuyo llegaría a esa persona, así que la única
      forma de que el bloqueo signifique algo es impedir escribir. El motivo dice
      **qué** ha pasado, nunca **quién** bloqueó (§6.5).
- [x] 7.14 Botón de bloqueo de un solo paso, visible y accesible.
      → *R-006* — sin diálogo. `e2e/social.spec.js` comprueba que aparece **un
      `204`** y que no hay ningún `role="dialog"`.

### R-007 a R-009 — Ausencia de moderación y privacidad

- [x] 7.15 Confirmar que **no existe** ningún endpoint ni botón de reporte.
      → *R-007* — `test_chat.py` recorre el mapa de rutas de la aplicación y
      `e2e/social.spec.js` busca botones de reportar en pantalla. Que algo no
      exista se comprueba mirando que no está.
- [x] 7.16 Distinguir visualmente los mensajes del sistema.
      → *R-007* — `kind` viene del servidor y se pinta con etiqueta «Aviso del
      sistema», fondo y borde de puntos. No es un icono en el cliente: si el
      cliente lo añadiera, alguien podría enviar `kind: "system"`.
- [x] 7.17 Implementar el borrado automático de mensajes a los 90 días.
      → *R-008* — `services/chat_retention.py`, borrado perezoso al leer.
- [x] 7.18 Verificar que no se registra la IP y que el chat exige sesión.
      → *R-009* — `test_no_personal_data.py` recorre **todas** las columnas del
      esquema y falla ante cualquier nombre de IP. El chat usa
      `require_current_user`.

### R-010 — Borrado de la cuenta

- [x] 7.19 `DELETE /api/auth/me`: borra la cuenta y, por cascada, partidas,
      puntuaciones, sesiones y mensajes; revoca la sesión y limpia la cookie.
      → *R-010* — `routers/auth.py`. Un `DELETE` del usuario, no una lista de
      borrados por tabla: esa lista se olvidaría el día que haya una tabla más.
- [x] 7.20 Pantalla de borrado con lo que va a pasar y sin prometer copia de
      los datos (no hay exportación: es deuda, §11 fila 7).
      → *R-010*, *R-009* — `components/DeleteAccountPanel.jsx`. **Aquí sí** se
      pide confirmación, que es la excepción: el bloqueo no la pide porque el
      momento de pulsarlo es justo cuando te molestan; borrar la cuenta no tiene
      vuelta atrás.

## Verificación de la spec

- [x] V.1 La clasificación funciona sin sesión.
- [x] V.2 No aparece ningún `username`.
- [x] V.3 Solo alias, puntuación y juego.
- [x] V.4 El bloqueo impide escribir.
- [x] V.5 Bloquear es un solo paso.
- [x] V.6 El HTML se muestra literal.
- [x] V.7 No se admiten enlaces ni imágenes.
- [x] V.8 El polling se pausa con la pestaña oculta.
- [x] V.9 Los mensajes nuevos no secuestran el foco.
- [x] V.10 No hay botón de reportar.
- [x] V.11 Los mensajes se borran por antigüedad.
- [x] V.12 El chat exige sesión.
- [x] V.13 Borrar la cuenta elimina todo lo suyo y revoca la sesión.

## Notas

- Esta spec **no reduce** el riesgo del chat sin moderación, solo lo contiene.
  El riesgo sigue registrado como deuda técnica (§11, fila 1) y hay que
  revisarlo si el proyecto se despliega alguna vez.
- La restricción de texto plano (R-004) se aplica **en el servidor**. Ocultarla
  solo en la interfaz dejaría el problema abierto para quien llame a la API
  directamente.
- `[CHAT_RETENTION]` y `[POLL_INTERVAL]` se resolvieron el 2026-10-16: **90 días**
  y **10 segundos** (§0.1, y duda 4 de `dudas.md`).
- El R-010 (borrado de cuenta) se añadió al empezar la spec: el R-008 original
  pedía el borrado y la exportación, y solo el borrado cabe aquí. La exportación
  queda en §11, fila 7.
- Al empezar esta spec, hay que **actualizar el índice** de `Docs/specs/README.md`
  a partir de aquí.

## Fallos reales que encontró la implementación

Se dejan escritos porque explican por qué hay tests que existen:

1. **`now()` de PostgreSQL dentro de una transacción es la hora de *inicio*, no
   la del `INSERT`.** Todos los tests comparten transacción, así que dos
   mensajes seguidos tenían la misma marca y el incremental por `since` —que es
   la base del polling— no se podía comprobar. Los tests de retención fijan
   `created_at` a propósito y lo explican: en producción cada petición es su
   propia transacción.
2. **`poll_from` vuelve como texto JSON, no como fecha.** Los validadores lo
   comprueban como cadena y lo reenvían tal cual. Convertirlo en el cliente sería
   una forma de que la marca se degradase una vez.
3. **El bloqueo necesita un identificador, y el chat no enviaba ninguno.** El
   botón no podía funcionar sin romper la regla de «solo alias». Se añadió
   `author_id` a la respuesta: es un identificador interno, no un dato personal,
   y no se muestra en pantalla.
4. **`format(texto)` sin segundo argumento reventaba la pantalla.** `Object
   .entries(undefined)` lanza, y el resultado era una pantalla en blanco en vez
   de un mensaje (R-009). Se.defensa `format` y se añade test.
5. **El aviso de «has bloqueado a X» se leía dos veces.** Estaba en un `p` visible
   y en otro `sr-only` con `aria-live`, y el lector de pantalla los anunciaba
   ambos. Lo detectó la auditoría de la spec 007. Ahora es un elemento visible
   con `aria-live="polite"`: dos cosas en uno, en vez de dos cosas.
6. **Un usuario recién registrado llenaba la clasificación de ceros.** Con un
   `LEFT JOIN` salía al final con 0 puntos, sin nada que aportar. Ahora es un
   join interior: solo aparece quien ha jugado.
7. **axe medía el contraste a mitad de la animación de entrada** y daba 1.07:1
   donde el texto ya quieto da 15.76:1. La auditoría espera a que terminen las
   animaciones. No se maquilla el resultado: el contraste que importa es el del
   estado en el que se lee.