# Plan — Spec 003: Autenticación

**Estado:** implementada
**Progreso:** 16/16 tareas
**Rama:** `feature/spec-003-autenticacion`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 — Contraseñas hasheadas, nunca cifradas

- [x] 3.1 Instalar y configurar **argon2id** con los parámetros recomendados
      para hardware de servidor.
      → *R-001*
- [x] 3.2 Crear el módulo de hashing: `hash_password` y `verify_password`.
      → *R-001*
- [x] 3.3 Confirmar que el salt se genera automáticamente y es único por
      contraseña.
      → *R-001*
- [x] 3.4 Revisar que ninguna ruta escribe la contraseña en un log.
      → *R-001*, *R-002*

### R-002 — La contraseña nunca vuelve al cliente

- [x] 3.5 Configurar los modelos de respuesta para que excluyan
      `password_hash` de forma explícita, no por descuido.
      → *R-002*

### R-003 y R-004 — Registro

- [x] 3.6 Implementar `POST /api/auth/register` con validación de `username`,
      `password` y confirmación.
      → *R-003*
- [x] 3.7 Comprobar la unicidad del `username` sin distinguir mayúsculas.
      → *R-003*
- [x] 3.8 Implementar la validación de contraseña: mínimo 8 caracteres, sin
      exigir símbolos ni mayúsculas.
      → *R-004*
- [x] 3.9 Mensajes de error en lenguaje llano, sin códigos técnicos.
      → *R-003*
- [x] 3.21 El registro abre sesión: `register` manda la cookie con el mismo
      código que `login`, y hay un test que comprueba que después de registrarse
      `GET /api/auth/me` responde 200.
      → *R-003*, *R-005*

### R-005 y R-006 — Sesiones

- [x] 3.10 Implementar `POST /api/auth/login` que crea la cookie de sesión
      firmada con `SECRET_KEY` y con expiración.
      → *R-005*
- [x] 3.11 Marcar la cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción.
      → *R-005*
- [x] 3.12 Crear la dependencia de sesión que valida en el servidor y expone el
      usuario actual.
      → *R-005*
- [x] 3.13 Implementar `POST /api/auth/logout` que invalida la sesión y
      elimina la cookie.
      → *R-006*

### R-007 y R-008 — Errores y límites

- [x] 3.14 Devolver un único mensaje genérico para usuario inexistente y para
      contraseña incorrecta.
      → *R-007*
- [x] 3.15 Implementar el límite de intentos y el bloqueo temporal, con
      mensaje claro.
      → *R-008*

### R-009 — Alias anónimo

- [x] 3.16 Implementar la generación de alias único e independiente del
      `username`.
      → *R-009*
- [x] 3.17 Test: dos usuarios con usernames parecidos reciben alias distintos;
      test: el alias no se puede calcular a partir del `username`.
      → *R-009*

### R-010 — Verificación obligatoria del hash

- [x] 3.18 Test que consulta la base de datos real y comprueba que lo
      almacenado no es la contraseña en claro y es un hash argon2id.
      → *R-010*
- [x] 3.19 Test: dos usuarios con la misma contraseña producen hashes
      distintos.
      → *R-010*
- [x] 3.20 Test: ninguna respuesta de registro ni de login incluye el hash.
      → *R-010*

## Verificación de la spec

- [x] V.1 Registro e inicio de sesión funcionan.
- [x] V.2 El `password_hash` es argon2id, no la contraseña.
- [x] V.3 Dos usuarios con la misma contraseña tienen hashes distintos.
- [x] V.4 No hay contraseñas en claro en la base de datos.
- [x] V.5 Ninguna respuesta contiene el hash.
- [x] V.6 El mensaje de fallo es idéntico en ambos casos.
- [x] V.7 La cookie es `httpOnly` y `SameSite=Lax`.
- [x] V.8 El cierre de sesión invalida en el servidor.
- [x] V.9 El bloqueo por intentos funciona.
- [x] V.10 El alias no se deriva del `username`.
- [x] V.11 El registro no pide correo.
- [x] V.12 Tras registrarse se puede usar la API sin volver a entrar.

## Notas

- **El registro abre sesión (R-003).** Se añadió el 2026-10-16, al implementar la
  spec 008. Recorriendo la aplicación de verdad se vio que la pantalla de éxito
  del alta decía «estás dentro como …» y llevaba a los juegos, pero el servidor no
  había creado ninguna sesión: todo lo que exigía cuenta devolvía 401 con un
  «Volver a intentarlo» que no funcionaba (§2.1.6). Primero se corrigió la spec
  (R-003 y R-005) y después el código, como manda la regla 4 de
  [`Docs/specs/README.md`](../README.md).

- El bloqueo por intentos (R-008) está en **PostgreSQL**, en la tabla
  `login_attempts`. No se ha añadido Redis ni ningún otro servicio: el proyecto
  ya tenía un almacén persistente con soporte transaccional y cada servicio
  nuevo hay que justificarlo (§0.3, punto 5).
- **No implementar recuperación de contraseña.** No existe y no debe indicarse
  en la interfaz: hacerlo prometería algo que el sistema no puede cumplir
  (§6.3).
- El alias se genera en el registro, pero **no se muestra prominently**: el
  usuario no necesita leerlo ni recordarlo. Aparece donde toque, en su
  puntuación o su chat.
- **La sesión tiene estado en el servidor.** Una cookie firmada sola no se puede
  revocar sin cambiar `SECRET_KEY`, y R-006 exige que cerrar sesión invalide de
  verdad. La cookie lleva el token firmado con `SECRET_KEY` y en la base de datos
  se guarda **su hash**, nunca el token: quien lea la tabla no puede suplantar a
  nadie.
- **El bloqueo es por nombre de usuario, no por IP.** Guardar la IP sería guardar
  un dato personal (§6.5) y el test `test_login_attempts_store_no_personal_data`
  lo impide. El coste es que alguien puede bloquear una cuenta ajena a propósito.
  En un entorno local (§7.0) es un riesgo bajo, pero **no es cero**: quien se
  encuentre bloqueado espera 15 minutos y entra.
- **El login comprueba la contraseña aunque el usuario no exista**, contra un hash
  de mentira con el mismo coste. Si no, el tiempo de respuesta ya revelaría qué
  nombres de usuario están registrados.
- **Los errores de validación se reescriben.** Pydantic devuelve
  `{"detail": [{"msg": "String should have at least 8 characters"}]}`; aquí se
  traduce a `{"message": "La contraseña necesita al menos 8 caracteres..."}`. Por
  eso las longitudes se validan en validadores propios y no con
  `Field(min_length=...)`.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.