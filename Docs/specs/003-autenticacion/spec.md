# Spec 003 — Autenticación

**Estado:** pendiente
**Fase:** 3 de 7
**Constitución:** §2.2 (cuentas), §6.2 (hash), §6.3 (riesgo sin correo)

## 1. Propósito

Connect usa **nombre de usuario y contraseña, sin correo electrónico**. No hay
verificación de correo ni recuperación de contraseña, y esa decisión está
asumida como riesgo documentado (§6.3): si alguien olvida su contraseña, pierde
la cuenta.

Esta spec implementa el registro y el inicio de sesión de forma segura pese a
esa limitación. El punto crítico es que **las contraseñas se guardan hasheadas
con argon2id y nunca cifradas** (§6.2), porque no hay recuperación que lo
compense: el usuario no puede demostrar que es él, así que la única protección
real es que nadie pueda leer la contraseña aunque tenga la base de datos entera.

Cada usuario recibe además un **alias anónimo autogenerado**, que es lo único
que verá de los demás en la clasificación y el chat (§2.2).

## 2. Alcance

**Incluye:**

- Registro de usuario.
- Inicio de sesión y cierre de sesión.
- Hasheado de contraseñas con argon2id.
- Sesiones con cookie httpOnly firmada.
- Generación del alias anónimo.
- Límite de intentos de inicio de sesión.

**Fuera de alcance:**

- Recuperación de contraseña (no existe, §6.3).
- Verificación por correo (no existe).
- OAuth o login social.
- Restablecimiento de contraseña por administrador.

## 3. Requisitos

### R-001 — Contraseñas hasheadas, nunca cifradas

Las contraseñas se almacenan **hasheadas con argon2id**, con salt por
contraseña.

- Nunca se cifra la contraseña: una contraseña cifrada es recuperable si alguien
  lee la base de datos.
- Nunca se usa SHA-256, MD5 ni ningún hash simple.
- El hash usa **salt por contraseña**, generado automáticamente por argon2id.
- El coste de cómputo es alto: **argon2id** con los parámetros recomendados por
  la biblioteca para hardware de servidor.
- La contraseña **no se escribe en ningún log**, ni en exito ni en error.

> **Por qué esto no es negociable:** si alguien accede a la base de datos y
> encuentra las contraseñas en claro, obtiene el acceso de todos los usuarios. Y
> sin recuperación por correo (§6.3), no hay forma de que el usuario recupere su
> cuenta: se queda fuera para siempre.

### R-002 — La contraseña nunca vuelve al cliente

- Ninguna respuesta de la API incluye el hash ni la contraseña.
- El usuario registrado nunca recibe su contraseña por respuesta.
- El hash tampoco aparece en logs ni en mensajes de error.

### R-003 — Registro de usuario

- Un usuario se registra con `username`, `password` y la confirmación de
  contraseña.
- El `username` es único, comparado **sin distinguir mayúsculas**.
- El `password_hash` nunca es el `password`.
- No se pide ni se almacena correo electrónico.
- Mensajes de error en **lenguaje llano**, sin códigos técnicos (§4.1).

### R-004 — Longitud y robustez de la contraseña

- Longitud mínima de 8 caracteres (`[MIN_PASSWORD_LEN]`).
- **No** se exigen símbolos, mayúsculas ni números como reglas obligatorias: esas
  reglas empujan a patrones predecibles y no aportan tanto como la longitud.
- No se rechazan contraseñas por ser "fáciles" de adivinar; eso es una decisión
  que desincentiva el uso.
- Nunca se recorta ni se transforma la contraseña: se usa tal cual el usuario
  la escribe, sin reglas ocultas de capitalización.

### R-005 — Sesión con cookie httpOnly

- El inicio de sesión devuelve una **cookie** de sesión `httpOnly`.
- La cookie es `Secure` en producción y `SameSite=Lax`.
- El identificador de sesión se firma con `SECRET_KEY` y **expira**.
- La sesión se valida **en el servidor** en cada petición protegida.
- El cliente **nunca** manipula el token.

### R-006 — Cierre de sesión

- El cierre de sesión invalida la sesión en el servidor.
- La cookie se elimina en el navegador.

### R-007 — Mensajes de error que no revelan información

- El fallo de autenticación devuelve **siempre el mismo mensaje**, tanto si el
  usuario no existe como si la contraseña es incorrecta.
- No se revela qué usernames existen: eso facilitaría el sondeo de la base de
  datos.

### R-008 — Límite de intentos de inicio de sesión

- Se limita el número de intentos fallidos por usuario y por origen.
- Al superar el límite, la cuenta se bloquea temporalmente.
- El mensaje al usuario es claro sobre el motivo del bloqueo.

### R-009 — Alias anónimo autogenerado

- Cada usuario recibe un alias único al registrarse.
- El alias **no lo elige el usuario**.
- El alias **no se deriva del `username`**: conocer el nombre de usuario no
  revela el alias, ni al revés.
- El alias es **estable**: es el mismo siempre que se vea en la clasificación,
  el chat y las puntuaciones.
- El alias no revela datos personales (§6.3).

### R-010 — Verificación obligatoria del hash

Existe un test que comprueba, sobre la base de datos real, que:

- Lo almacenado **no es** la contraseña en claro.
- Lo almacenado **es** un hash argon2id con salt.
- Un segundo usuario con la misma contraseña produce un hash **distinto**
  (demuestra que el salt es único por contraseña).
- Ninguna respuesta de la API de registro o login incluye el hash.

## 4. Criterios de aceptación

- [ ] Se puede registrar un usuario y iniciar sesión.
- [ ] El `password_hash` en la base de datos es un hash argon2id, no la
      contraseña.
- [ ] Dos usuarios con la misma contraseña tienen hashes distintos.
- [ ] `grep` sobre la base de datos no encuentra ninguna contraseña en claro.
- [ ] Ninguna respuesta de la API contiene el hash ni la contraseña.
- [ ] El fallo de login da el mismo mensaje si el usuario no existe o si la
      contraseña falla.
- [ ] La cookie de sesión es `httpOnly` y `SameSite=Lax`.
- [ ] Cerrar sesión invalida la sesión en el servidor.
- [ ] El bloqueo por intentos funciona y el mensaje es claro.
- [ ] El alias no se puede derivar del `username`.
- [ ] El registro funciona sin correo electrónico y no pide ninguno.

## 5. Dependencias y referencias

- **Predecesoras:** 001 (entorno), 002 (esquema de datos).
- **Sucesoras:** 006 (frontend accesible, que necesita la pantalla de login).
- **Constitución:** §2.2 (cuentas), §6.2 (hash), §6.3 (riesgo asumido), §4.1
  (mensajes en lenguaje llano).