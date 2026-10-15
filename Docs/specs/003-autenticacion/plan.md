# Plan — Spec 003: Autenticación

**Estado:** pendiente
**Progreso:** 0/15 tareas
**Rama:** `feature/spec-003-autenticacion`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 — Contraseñas hasheadas, nunca cifradas

- [ ] 3.1 Instalar y configurar **argon2id** con los parámetros recomendados
      para hardware de servidor.
      → *R-001*
- [ ] 3.2 Crear el módulo de hashing: `hash_password` y `verify_password`.
      → *R-001*
- [ ] 3.3 Confirmar que el salt se genera automáticamente y es único por
      contraseña.
      → *R-001*
- [ ] 3.4 Revisar que ninguna ruta escribe la contraseña en un log.
      → *R-001*, *R-002*

### R-002 — La contraseña nunca vuelve al cliente

- [ ] 3.5 Configurar los modelos de respuesta para que excluyan
      `password_hash` de forma explícita, no por descuido.
      → *R-002*

### R-003 y R-004 — Registro

- [ ] 3.6 Implementar `POST /api/auth/register` con validación de `username`,
      `password` y confirmación.
      → *R-003*
- [ ] 3.7 Comprobar la unicidad del `username` sin distinguir mayúsculas.
      → *R-003*
- [ ] 3.8 Implementar la validación de contraseña: mínimo 8 caracteres, sin
      exigir símbolos ni mayúsculas.
      → *R-004*
- [ ] 3.9 Mensajes de error en lenguaje llano, sin códigos técnicos.
      → *R-003*

### R-005 y R-006 — Sesiones

- [ ] 3.10 Implementar `POST /api/auth/login` que crea la cookie de sesión
      firmada con `SECRET_KEY` y con expiración.
      → *R-005*
- [ ] 3.11 Marcar la cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción.
      → *R-005*
- [ ] 3.12 Crear la dependencia de sesión que valida en el servidor y expone el
      usuario actual.
      → *R-005*
- [ ] 3.13 Implementar `POST /api/auth/logout` que invalida la sesión y
      elimina la cookie.
      → *R-006*

### R-007 y R-008 — Errores y límites

- [ ] 3.14 Devolver un único mensaje genérico para usuario inexistente y para
      contraseña incorrecta.
      → *R-007*
- [ ] 3.15 Implementar el límite de intentos y el bloqueo temporal, con
      mensaje claro.
      → *R-008*

### R-009 — Alias anónimo

- [ ] 3.16 Implementar la generación de alias único e independiente del
      `username`.
      → *R-009*
- [ ] 3.17 Test: dos usuarios con usernames parecidos reciben alias distintos;
      test: el alias no se puede calcular a partir del `username`.
      → *R-009*

### R-010 — Verificación obligatoria del hash

- [ ] 3.18 Test que consulta la base de datos real y comprueba que lo
      almacenado no es la contraseña en claro y es un hash argon2id.
      → *R-010*
- [ ] 3.19 Test: dos usuarios con la misma contraseña producen hashes
      distintos.
      → *R-010*
- [ ] 3.20 Test: ninguna respuesta de registro ni de login incluye el hash.
      → *R-010*

## Verificación de la spec

- [ ] V.1 Registro e inicio de sesión funcionan.
- [ ] V.2 El `password_hash` es argon2id, no la contraseña.
- [ ] V.3 Dos usuarios con la misma contraseña tienen hashes distintos.
- [ ] V.4 No hay contraseñas en claro en la base de datos.
- [ ] V.5 Ninguna respuesta contiene el hash.
- [ ] V.6 El mensaje de fallo es idéntico en ambos casos.
- [ ] V.7 La cookie es `httpOnly` y `SameSite=Lax`.
- [ ] V.8 El cierre de sesión invalida en el servidor.
- [ ] V.9 El bloqueo por intentos funciona.
- [ ] V.10 El alias no se deriva del `username`.
- [ ] V.11 El registro no pide correo.

## Notas

- El bloqueo por intentos (R-008) necesita un almacén. Se puede resolver con
  PostgreSQL o con una caché. Si sale un backend de caché, hay que añadirla al
  `docker-compose.yml` y justificarlo (§0.3, punto 5).
- **No implementar recuperación de contraseña.** No existe y no debe indicarse
  en la interfaz: hacerlo prometería algo que el sistema no puede cumplir
  (§6.3).
- El alias se genera en el registro, pero **no se muestra prominently**: el
  usuario no necesita leerlo ni recordarlo. Aparece donde toque, en su
  puntuación o su chat.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.