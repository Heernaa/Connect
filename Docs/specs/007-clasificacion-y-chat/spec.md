# Spec 007 — Clasificación y chat

**Estado:** planificada — **implementación no autorizada**
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
- **Nunca** se muestra el `username`.
- Clasificación **global** acumulada y **por juego**.
- Solo la clasificación total en el MVP: no hay diaria ni semanal, porque el
  contenido no rota (§2.1.3).

### R-002 — Ordenación coherente

- Orden por puntuación descendente.
- Desempate por Alias, de forma **estable y determinista**.
- Paginación: no se devuelven miles de filas de una vez.

### R-003 — Chat por polling

- El cliente consulta periódicamente y recibe mensajes nuevos.
- Intervalo `[POLL_INTERVAL]`, propuesta 10 segundos.
- El polling **se detiene cuando la pestaña no está visible** y se reanuda al
  volver: ahorra recursos y batería.
- Cada mensaje trae: alias, texto y marca de tiempo.
- El cliente no hace scroll automático agresivo ni secuestra el foco al llegar
  un mensaje (§4.1).

### R-004 — Mensajes en texto plano

- El chat **no admite enlaces, imágenes ni formato**.
- El texto se escapa siempre: un mensaje con HTML se muestra como texto, nunca
  se ejecuta.
- Límite de longitud por mensaje para acotar el abuso (§6.8).
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

- Los mensajes se conservan `[CHAT_RETENTION]`, propuesta 90 días (§6.3).
- Pasado el plazo se borran automáticamente.
- El usuario puede borrar su propia cuenta y con ella sus mensajes (§6.3).

### R-009 — Privacidad del chat

- El chat es un dato personal aunque use alias (§6.3).
- No se registra ni se expone la IP de quien escribe.
- El chat **no es accesible sin iniciar sesión**.

## 4. Criterios de aceptación

- [ ] La clasificación se consulta sin iniciar sesión.
- [ ] No aparece ningún `username` en la clasificación ni en el chat.
- [ ] Solo se ven alias, puntuación y juego.
- [ ] Un usuario bloqueado no puede escribir al que le bloqueó.
- [ ] Bloquear es un solo paso, sin confirmación.
- [ ] Un mensaje con HTML se muestra literal, no se ejecuta.
- [ ] No se pueden enviar enlaces ni imágenes.
- [ ] El polling se detiene con la pestaña oculta.
- [ ] Al llegar un mensaje nuevo no mueve el foco ni hace scroll brusco.
- [ ] No existe ningún botón de reportar.
- [ ] Los mensajes se borran pasado el plazo de retención.
- [ ] El chat requiere sesión iniciada.

## 5. Dependencias y referencias

- **Predecesoras:** 001, 002, 003, 005 (puntuaciones ya calculadas).
- **Sucesoras:** ninguna.
- **Constitución:** §2.3, §2.4, §6.3 (datos mínimos), §6.8 (riesgo asumido).
- **Nota de riesgo:** la ausencia de moderación es una **deuda técnica
  registrada** (§11, fila 1). Esta spec no la reduce, solo la contiene.