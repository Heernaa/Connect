# Spec 007 — Clasificación y chat

**Estado:** implementada
**Fase:** 6 de 7
**Constitución:** §2.3 (comunidad), §2.4 (clasificación), §6.8 (chat)

## 1. Propósito

El valor de Connect no está en los juegos, sino en la **conexión social**: ver
que hay otras personas jugando, y poder hablar con ellas. Esta spec construye
esas dos piezas: una clasificación visible sin necesidad de cuenta, y un chat
por polling entre usuarios identificados solo por su alias anónimo.

El chat tiene una restricción importante: **no hay moderación** (§6.8). Eso no
significa que no haya responsabilidad, sino que la contención se consigue con
mecanismos que funcionan sin intervención humana: bloquear y no admitir
enlaces.

## 2. Alcance

**Incluye:**

- Clasificación global y por juego.
- Chat por polling.
- Bloqueo de usuarios.
- Retención de mensajes.

**Fuera de alcance:**

- Moderación de chat: no existe en el MVP (§6.8).
- Botón de reportar: **no se implementa**, por decisión (§6.8).
- Mensajes directos privados.
- Avatares, fotos o nombres reales: no existen (§2.2).

## 3. Requisitos

### R-001 — Clasificación visible sin cuenta

- `GET /api/leaderboard` devuelve la clasificación **sin iniciar sesión**
  (§2.4).
- Se muestra **alias, puntuación y juego**. Nada más (§6.3).
- **Nunca** se muestra el `username`. La garantía no depende de acordarse de
  quitarlo: el esquema de respuesta **no declara ese campo**, así que no sale
  ni por descuido. Un test lo comprueba sobre el cuerpo entero.
- Clasificación **global** acumulada y **por juego**.
- Solo la clasificación total en el MVP: no hay diaria ni semanal, porque el
  contenido no rota (§2.1.3).

### R-002 — Ordenación coherente

- Orden por puntuación descendente.
- Desempate por Alias, de forma **estable y determinista**.
- Paginación: no se devuelven miles de filas de una vez.

### R-003 — Chat por polling

- El cliente consulta periódicamente y recibe mensajes nuevos.
- Intervalo de **10 segundos** (decidido el 2026-10-16, §0.1).
- El polling **se detiene cuando la pestaña no está visible** y se reanuda al
  volver: ahorra recursos y batería.
- Cada mensaje trae: alias, texto y marca de tiempo.
- El cliente no hace scroll automático agresivo ni secuestra el foco al llegar
  un mensaje (§4.1).

### R-004 — Mensajes en texto plano

- El chat **no admite enlaces, imágenes ni formato**.
- El rechazo de enlaces ocurre **en el servidor**, no solo en la interfaz: si
  solo se ocultara en el cliente, quien llame a la API directamente podría
  seguir escribiéndolos (§2.5, la frontera crítica).
- El texto se escapa siempre: un mensaje con HTML se muestra como texto, nunca
  se ejecuta.
- Límite de **500 caracteres** por mensaje para acotar el abuso (§6.8).
- Esto **reduce sustancialmente el phishing**, que es el vector de ataque más
  probable contra este perfil de usuario (§6.8).

### R-005 — Alias en el chat

- Cada mensaje muestra el **alias anónimo** del autor (§2.2).
- **Nunca** el `username`.
- El alias es el mismo que aparece en la clasificación.

### R-006 — Bloqueo de usuarios

- Botón de **bloquear** a otro usuario, visible y accesible (§4.1).
- El bloqueo es **inmediato y en un solo paso**, sin diálogo de confirmación:
  pedir "¿seguro?" justo cuando alguien te hostiga es lo contrario de útil.
- Un usuario bloqueado **no puede** enviar mensajes al que le bloqueó.
- El bloqueo es bidireccional en la práctica: el bloqueado deja de ver los
  mensajes del bloqueador.
- Se puede desbloquear.

### R-007 — Sin moderación ni reporte

- **No existe** botón de reportar (§6.8): sin moderadores, el reporte no tiene
  destinatario.
- **No hay** filtro automático de palabras.
- Los mensajes del sistema se distinguen visualmente de los de los usuarios
  (§6.4), para que no haya suplantación del sistema.

### R-008 — Retención de mensajes

- Los mensajes se conservan **90 días** (decidido el 2026-10-16, §0.1).
- Pasado el plazo se borran automáticamente.
- El borrado es **perezoso**: ocurre al leer el chat, no con un proceso en
  segundo plano. El entorno local no tiene planificador (§7.0) y añadir uno sería
  la primera infraestructura nueva sin justificar (§6.7). El efecto observable
  es el mismo: un mensaje pasado el plazo nunca se ve ni se descarga.
- **Límite de 500 caracteres** por mensaje.

### R-009 — Privacidad del chat

- El chat es un dato personal aunque use alias (§6.3).
- No se registra ni se expone la IP de quien escribe.
- El chat **no es accesible sin iniciar sesión**.

### R-010 — Borrado de la cuenta

> **Alcance de esta decisión.** El R-008 original pedía «borrar su propia cuenta y
> con ella sus mensajes». Se mantiene el **borrado** y se aparta la
> **exportación**, que es otra funcionalidad y otra pantalla: la constitución
> §6.5 exige las dos, y exportar no entra aquí. Queda como deuda técnica en §11.

- El usuario puede **borrar su propia cuenta** desde su sesión.
- El borrado es **definitivo**: no hay ventana de recuperación ni vuelta atrás,
  y el interfaz lo dice antes de hacerlo (§4.2, sin dark patterns).
- Al borrar se van **la cuenta, las partidas, las puntuaciones, las sesiones y
  los mensajes** del usuario. No queda rastro que le identifique (§6.5).
- La sesión se revoca: la cookie deja de servir aunque siga en el navegador.
- **No se ofrece exportación** en esta spec, y la pantalla de borrado no promete
  una copia de los datos.

## 4. Criterios de aceptación

- [x] La clasificación se consulta sin iniciar sesión.
- [x] No aparece ningún `username` en la clasificación ni en el chat.
- [x] Solo se ven alias, puntuación y juego.
- [x] Un usuario bloqueado no puede escribir al que le bloqueó.
- [x] Bloquear es un solo paso, sin confirmación.
- [x] Un mensaje con HTML se muestra literal, no se ejecuta.
- [x] No se pueden enviar enlaces ni imágenes.
- [x] El polling se detiene con la pestaña oculta.
- [x] Al llegar un mensaje nuevo no mueve el foco ni hace scroll brusco.
- [x] No existe ningún botón de reportar.
- [x] Los mensajes se borran pasado el plazo de retención.
- [x] El chat requiere sesión iniciada.
- [x] Borrar la cuenta elimina también partidas, puntuaciones, sesiones y
      mensajes, y revoca la sesión.

## 5. Dependencias y referencias

- **Predecesoras:** 001, 002, 003, 005 (puntuaciones ya calculadas).
- **Sucesoras:** 008.
- **Constitución:** §2.3, §2.4, §6.3 (datos mínimos), §6.8 (riesgo asumido).
- **Nota de riesgo:** la ausencia de moderación es una **deuda técnica
  registrada** (§11, fila 1). Esta spec no la reduce, solo la contiene.