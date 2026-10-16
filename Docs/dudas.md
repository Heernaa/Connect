# Dudas abiertas — ProyectoInicial

> Preguntas que necesitan respuesta antes de poder avanzar con seguridad.
> Cada duda indica **por qué importa** y **qué se pierde si se decide al vuelo**.
>
> Al resolverse, se documenta en §10 de [`constitution.md`](./constitution.md)
> y la pregunta se marca como `✅ RESUELTA`.

**Prioridad:** 🔴 bloquea el inicio · 🟡 necesaria antes de esa sección · 🟢 mejora

---

## 🔴 Bloqueantes

### 1. ✅ RESUELTA — ¿Qué juegos concretos vamos a hacer?

**Respuesta (2026-10-15):** tres juegos para la v1:

| Juego | Tipo | Notas |
|---|---|---|
| **Paraulógic** | Deducción de palabras, estilo *Paraulogical* | Pendiente de cerrar reglas |
| **Wordle** | 5 huecos, 6 intentos, 3 pistas por letra | Set único, sin rotación |
| **Acertijo** | Pregunta con respuesta correcta única | Set único, sin rotación |

Decidido en la constitución (§2.1):
- Los tres son **de turnos, sin límite de tiempo y sin precisión motora fina**.
- Los tres son **juegos de pensar**: prima el razonamiento, no la rapidez.
- Comparten un **modelo de datos único** con `GameId`. Añadir un cuarto juego
  no puede obligar a cambiar las tablas de usuarios ni de puntuaciones.
- La mecánica vive **en el cliente** (React, para que vaya fluida); el
  **servidor valida y puntúa** (§6.7).
- **Todo el contenido viene de PostgreSQL por la API** (§2.1.2). Cero palabras
  de juego escritas en el código del cliente.
- **Idioma único: español.**
- **MVP: un solo set por juego**, fijo, sin rotación diaria (§2.1.3).

---

#### 1.a ✅ RESUELTA — ¿En qué idioma?

**Solo español.** Sin traducción ni multiidioma en el MVP. El modelo de datos
llevará `lang` para no bloquear la extensión futura, pero siempre valdrá `es`.

---

#### 1.b 🟡 PARCIAL — ¿De dónde salen las palabras y los acertijos?

**Resuelto:** el contenido **estará en la base de datos** y se sirve por la API.
La estructura de las tablas la definimos nosotros (§2.1.2).

**Pendiente:** hay que decidir **quién crea y carga ese contenido**. No es un
detalle: es trabajo de redacción.

- **Wordle:** 1 palabra objetivo + validación de lo que escribe el jugador.
  ¿Hacemos un validador que compruebe contra un diccionario, o el MVP acepta
  cualquier combinación de 5 letras?
- **Paraulógic:** 1 palabra objetivo + sus pistas.
- **Acertijo:** N enunciados con su respuesta correcta.

> **Nota importante:** he asumido que el set de Wordle y Paraulógic es de **una
> sola palabra**. Con una única palabra, la "validación" es trivial pero el juego
> se agota rápido. Si quieres que el jugador pueda repetir, hará falta un
> diccionario en la base de datos. **¿Cuántas palabras y cuántos acertijos
> quieres en el MVP?** Con 1, 5 o 50 el diseño es distinto.

---

#### 1.b ✅ RESUELTA — ¿Cuánto contenido hay?

**Definido y cargado en `data/seed_v0.sql`** (§2.1.8 de la constitución):

| Juego      | Cantidad | Detalle                                       |
| ---------- | -------- | --------------------------------------------- |
| Wordle     | 1 palabra | `LUNAS`                                      |
| Acertijo   | 1         | "Tengo ciudades..." → el mapa                 |
| Paraulógic | 1 set    | Letras `A E N R S T` → **57 palabras**        |

Paraulógic cumple el requisito: **6 letras** (mínimo 5) y **57 palabras**
(mínimo 10). La regla de formación se verificó por script: cada palabra usa solo
letras del conjunto y ninguna más veces de las que aparece.

---

#### 1.c ✅ RESUELTA — Reglas de Paraulógic

Definido en §2.1.4 de la constitución:
- Conjunto de letras → **varias palabras** que hay que adivinar todas.
- **Intentos infinitos.** No hay límite.
- **No se puede perder.** Nunca hay estado de derrota.
- **Botón de pista opcional**, no resta puntos.
- **Partida pausable**: salir y volver sin perder progreso (§2.1.7).

---

#### 1.d ✅ RESUELTA — ¿Acertijo — cómo se valida?

**Hay una respuesta correcta**, guardada en la base de datos. Se compara en el
servidor con normalización (mayúsculas, tildes, espacios).

Punto clave que has aclarado y que cambia el diseño:
> **Lo importante es el ejercicio de pensar.**

Por tanto (§2.1.4, §2.1.5):
- La puntuación **no premia acertar a la primera ni la rapidez**.
- El acierto **siempre** da puntos. Nadie se queda con cero por confundir dos
  tildes, que es el error más común a esta edad.
- Si el sistema no reconoce una respuesta correcta, el jugador puede
  **reportarlo**. El reporte se registra para revisión, pero **no** concede
  puntos automáticamente (evitar que reportar sea una forma de trampas).

**Pendiente menor:** ¿el reporte de respuesta correcta lo revisa una persona
o se acepta automáticamente? Afecta al trabajo de backend.

---

#### 1.e ✅ RESUELTA — ¿Se puede jugar varias veces?

**Depende del juego, y ahora está definido:**

- **Wordle: UNA sola vez por jugador.** Al terminar o abandonar, no se puede
  volver a jugar; la pantalla muestra el resultado.
- **Paraulógic: intentos ilimitados** dentro de la partida (no es lo mismo que
  empezar partidas nuevas).
- **Acertijo:** pendiente, hereda el mismo criterio que Wordle.

> **Nota sobre Paraulógic:** "sin límite de intentos" dentro de una partida es
> compatible con "una partida por jugador". Si un usuario puede **empezar la
> partida desde cero** tantas veces quiera, el top 100 sería 100 personas
> resolviéndolo a la primera. **¿Se puede reiniciar la partida?** Es la duda
> que queda de este punto.

---

### 1.c ✅ RESUELTA — Reglas de Paraulógic

**Definido:**
- Se muestra un **conjunto de letras** que forman **varias palabras**.
- El jugador debe **adivinarlas todas**.
- **No hay límite de intentos.**
- Hay un **botón de pistas** que da una ayuda y **resta puntos**.
- Las palabras vienen de la base de datos por la API.

**Pendiente menor (no bloqueante):**
- Coste exacto en puntos de cada pista.
- Si las palabras se revelan al terminar aunque no se hayan encontrado todas.
- ¿Hay un único nivel o varios? Asumido: **uno solo** en MVP.

---

### 2. ✅ RESUELTA — ¿Cómo se autentican los usuarios?

**Nombre de usuario + contraseña. Sin correo electrónico. Riesgo asumido.**

Registrado en §2.2 y §6.3 de la constitución.

> **Corrección técnica importante.** Dijiste "contraseñas encriptadas". Lo he
> recogido como **hasheadas**, y es una distinción que importa:
>
> - **Cifrar** = reversible con una clave. Si alguien lee la base de datos,
>   lee todas las contraseñas. Inaceptable.
> - **Hashear** (argon2/bcrypt) = irreversible. Solo se puede comprobar si lo
>   tecleado coincide. Si alguien lee la base de datos, no obtiene nada.
>
> Por eso la constitución exige argon2 o bcrypt con salt (§6.2). Si guardamos
> cifrado, habríamos creado un problema que no existía. El riesgo que asumes es
> "no hay recuperación de contraseña", que es otro distinto y está bien
> documentado.

Riesgos asumidos (§6.3):
- Contraseña olvidada = cuenta perdida, sin recuperación.
- Sin verificación de correo: alguien puede registrar el nombre de otro.

**Pendiente menor:**
- Longitud mínima de contraseña (`[MIN_PASSWORD_LEN]`). **✅ RESUELTO 2026-10-16:
  8 caracteres**, sin exigir símbolos ni mayúsculas. Registrado en §6.2 y §12 de
  la constitución. Motivo: las reglas complejas empujan a usar patrones
  predecibles, y el usuario objetivo abandona antes con requisitos exigentes.
- ¿Los nombres de usuario pueden ser fácilmente adivinables? No se muestran
  públicamente, así que el riesgo es bajo.

---

### 3. ✅ RESUELTA — ¿Qué nivel de accesibilidad exigimos?

**WCAG 2.2 nivel AA.** Decidido y aplicado en §4 de la constitución.

Además de lo que exige WCAG, la constitución fija tres mínimos más estrictos por
el perfil del usuario: fuente 16px ampliable al 200%, objetivos táctiles de
44×44px y contraste 4.5:1.

> ¿Hay alguna auditoría externa o certificación que debamos pasar? No bloquea,
> pero si existe hay que presupuestarla.

---

### 4. ✅ RESUELTA — El chat

**Resuelto el 2026-10-16:**

1. **Transporte: polling de 10 segundos.** El intervalo se detiene cuando la
   pestaña no está visible y se reanuda al volver: ahorra recursos y batería.
2. **Retención: 90 días.** Los mensajes son datos personales (§6.5), así que
   pasado el plazo se borran. El borrado es **perezoso**, al leer el chat,
   porque el entorno local no tiene planificador y añadirlo sería la primera
   infraestructura nueva sin justificar (§6.7).
3. **Chat público y único**, con alias anónimos. No hay salas ni mensajes
   privados en el MVP (§2.6).
4. **Sin moderación**, solo bloqueo (§6.8). Ver la duda 4.b.
5. **Longitud máxima: 500 caracteres.** Suficiente para escribir con calma y lo
   bastante corto para acotar el abuso.

---

### 4.b ✅ RESUELTA — Moderación del chat: mitigaciones

**Decidido: sin moderadores y sin botón de reportar. Solo bloqueo.**

El motivo de no tener reporte es razonable: sin nadie a quien REPORTAR, el botón
solo genera frustración. El bloqueo sí tiene efecto inmediato y es lo que
realmente protege.

Mitigaciones que sí se implementan (§6.8, spec 007):
- [x] Botón de **bloquear** a otro usuario
- [x] Un bloqueado no puede escribir al que le bloqueó
- [x] **Solo texto plano: sin enlaces ni imágenes** (reduce phishing)
- [x] Límite de longitud de mensaje (500 caracteres)

**Riesgo residual aceptado:** el acoso continúa mientras la víctima no bloquee.
Quien abusa puede ser bloqueado; quien no se defiende puede pedir ayuda fuera de
la plataforma. Documentado en la deuda técnica (§11, fila 1).

> Con el entorno local (§7.0) el riesgo es bastante menor: no hay miles de
> desconocidos, sino quien esté alrededor. Cuando se despliegue a público, esto
> habrá que revisar sí o sí.

**Lo que no se pregunta:** *quién* modera y *con qué listas de palabras*. Queda
descartado por decisión (§2.6).

---

## 🟡 Necesarias antes de esa sección

### 5. ✅ RESUELTA — ¿Cómo se calcula y valida la puntuación?

**Paraulógic: 1 punto por palabra encontrada. Intentos infinitos. No se puede
perder. Las pistas no restan puntos.**

Consecuencia asumida y documentada en §2.1.5: con intentos infinitos y pistas
gratis, la puntuación mide cuántas palabras ha encontrado, no su dificultad.
Un jugador puede llegar al máximo sin habilidad especial. Es una decisión
consciente — para este usuario, la frustración de perder es peor que una
clasificación poco informativa.

**Pendiente:**
- **Wordle** (`[WORDLE_POINTS]`): **✅ RESUELTO 2026-10-16. Base 100 puntos,
  restando un 10 % por cada intento usado.** Acierto al intento 1 = 100; al
  intento 6 = 50.
- **Anti-trampas** (§6.6): el servidor rechaza puntuaciones imposibles. Con
  Paraulógic es trivial de validar (1 punto por palabra que exista en la
  tabla). Con Wordle hay que validar el intento completo.
- **Acertijo:** **✅ RESUELTO 2026-10-16. 10 puntos fijos** al acertar, sin
  penalización por intentos ni por tiempo. Queda por debajo de Wordle en la
  clasificación porque es el juego más fácil, que es lo coherente con §2.1.5.

---

### 6. ✅ DESCARTADA — Moderación del chat

Sin moderadores, sin reporte. Solo **bloqueo**, que sí tiene efecto inmediato.

Las dudas sobre *quién* modera, listas de palabras y filtros quedan descartadas
por decisión. Ver §6.8 de la constitución, donde están los riesgos asumidos y
las mitigaciones que sí se implementan.

---

### 7. ✅ RESUELTA — Stack de pruebas

**Playwright para E2E y accesibilidad.** Decidido.

Propuesta para lo que falta:

| Capa | Herramienta |
|---|---|
| Backend unitarias e integración | `pytest` + `httpx` (`[TEST_UNIT]`) |
| Frontend unitarias | Vitest + React Testing Library |
| E2E y accesibilidad | **Playwright** (decidido) |

Playwright se usa en **tres frentes**: recorridos E2E en los tres dispositivos
(§7.1), auditoría de accesibilidad con axe-core, y tests de navegación por
teclado.

> Faltaba confirmar el stack de unitarias.
>
> **✅ RESUELTO 2026-10-16: `pytest` + `httpx` para el backend.** Registrado en
> §5 y §12 de la constitución. Cubre unitarias e integración contra
> PostgreSQL real, que es lo que exigen los tests de validación de puntuación y
> de hash (§5, regla de oro).

---

### 8. ✅ RESUELTA — Despliegue

**No hay despliegue. El proyecto vive en local.** Documentado en §7.0.

Simplifica bastante:
- Sin costes de hosting, sin claves de servicios externos, sin CI obligatoria.
- Sin HTTPS (es tráfico local), sin escalado, sin alta disponibilidad.

**Docker local sigue siendo buena idea** para que el entorno sea reproducible:
mismo PostgreSQL en cualquier máquina. Propuesta: `docker compose up`.

> **Aviso importante** (§7.0): que sea local **no baja ningún estándar**. Las
> contraseñas se hashean igual, la validación en servidor sigue siendo
> obligatoria, las pruebas se siguen exigiendo y la accesibilidad se cumple
> igual. "Es local" cambia el despliegue, nunca la calidad del código.

**Pendiente para el futuro:** cuando se despliegue, habrá que añadir HTTPS
(obligatorio), CI y recuperación de contraseña. Está en la deuda técnica
(§11, filas 4, 5 y 6).

---

### 9. ✅ RESUELTA — Nombre del proyecto

**Connect.** El proyecto se llama **Connect** a partir de ahora.

---

### 10. 🟡 RGPD / LOPD

Se simplifica bastante gracias a la identidad anónima (§2.2, §6.5):
- **No hay nombres reales ni fotos**, así que hay mucho menos que proteger.
- Pero siguen siendo datos personales: el alias, la puntuación y el chat.

Pendiente:
- ¿Quién es el responsable del tratamiento?
- ¿Aviso de privacidad y consentimiento explícito? (con mayores, la respuesta
  probablemente sea sí)
- **Retención del chat**: ✅ **90 días** (resuelto 2026-10-16).
- **Cuentas inactivas**: ¿se borran a los X meses?
- Derecho de **borrado**: ✅ implementado en la spec 007.
  Derecho de **exportación**: falta, registrado en §11 de la constitución.

> ¿Esto lo lleva alguien del equipo o hay que contratarlo?

---

## 🟢 Mejoras (no bloquean)

### 11. ✅ RESUELTA — ¿Qué dispositivos son el objetivo real?

**Resuelto:** los **tres** son objetivo de primera clase — **ordenadores,
tablets y móviles**. Ninguno es secundario.

Esto es más exigente que "tablet + escritorio con soporte móvil": significa que
cada pantalla se diseña y se prueba en los tres (§7.1), y que Playwright corre
los E2E en los tres perfiles.

### 12. ✅ RESUELTA — ¿Los nombres visibles?

**Anónimos.** Cada usuario tiene un **alias autogenerado** (p. ej. `LoboTranquilo`).
El usuario **no lo elige** y no revela nada de su identidad real.

Consecuencia a tener en cuenta: esto **hace imposible la verificación de edad**,
que era una de las razones por las que planteábamos nombres reales. Si en el futuro
se quisiera demostrar que el producto es para mayores, habría que añadir otro
mecanismo.

### 13. 🟢 ¿Avatares / foto de perfil?
**Descartado**: no hay avatares ni fotos. Va contra la identidad anónima (§2.2)
y sería un dato personal más.

### 14. 🟢 ¿Personalización de dificultad?
En el MVP hay **un único set por juego**, así que no hay dificultad que ajustar.
Si en la v2 se añaden más niveles, esto vuelve a ser una decisión abierta.

### 15. ✅ RESUELTA — ¿Idiomas?
Resuelto en duda **1.a**: **solo español**.

---

## Resumen de bloqueos

> **✅ Todo resuelto. No queda ninguna duda abierta.**

Resueltas: **1** (los tres juegos), **1.a** (idioma), **1.b** (contenido),
**1.c** (Paraulógic), **1.d** (Acertijo), **1.e** (Wordle una vez), **2**
(autenticación), **3** (WCAG 2.2 AA), **4** y **4.b** (polling, bloqueo sin
moderación), **5** (puntuación), **6** (alias anónimos), **7** (Playwright),
**8** (local, sin despliegue), **9** (Connect), **11-15**.

### Detalles menores por decidir (ninguno bloquea)

| #  | Pendiente                                        | Propuesta       |
| -- | ------------------------------------------------- | --------------- |
| 5  | Fórmula de Wordle (`[WORDLE_POINTS]`) y Acertijo | ✅ **100 pts base, −10 % por intento; Acertijo 10 pts** |
| 2  | Longitud mínima de contraseña                    | ✅ **8 caracteres** |
| 4  | Retención del chat e intervalo de polling        | 90 días / 10 s  |
| 7  | Confirmar `pytest` + Vitest para unitarias       | ✅ **pytest + httpx + Vitest** |
| 10 | RGPD: responsable, consentimiento, retención     | Pendiente       |

> **Se puede empezar ya** por: estructura del proyecto, esquema de PostgreSQL,
> API de contenido de juegos, autenticación con argon2, y el frontend accesible.

### Decisiones de riesgo asumido

Cuatro decisiones están documentadas como riesgo consciente, no como olvido:

| Decisión                            | Dónde  | Deuda |
| ----------------------------------- | ------ | ----- |
| Chat sin moderación ni reporte      | §6.8   | nº 1  |
| Puntuación de Paraulógic trivial   | §2.1.5 | nº 3  |
| Sin recuperación de contraseña     | §6.3   | nº 4  |
| Sin verificación de correo         | §6.3   | nº 5  |

Todas son razonables para un MVP local. Lo importante es que están **escritas**,
para revisitarlas cuando el proyecto cambie de fase.
