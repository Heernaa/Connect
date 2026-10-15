# Plan — Spec 001: Entorno local

**Estado:** pendiente
**Progreso:** 0/14 tareas
**Rama:** `feature/spec-001-entorno-local`
**Spec:** [`spec.md`](./spec.md)

## Tareas

### R-001 — PostgreSQL local reproducible

- [ ] 1.1 Crear `docker-compose.yml` con el servicio PostgreSQL, versión
      fijada, puerto `5432`, volumen persistente y healthcheck.
      → *R-001*
- [ ] 1.2 Verificar que el contenedor arranca y acepta conexiones.
      → *R-001*

### R-002 — Configuración por entorno

- [ ] 2.1 Definir el esquema de configuración del backend con Pydantic
      Settings: `DATABASE_URL`, `SECRET_KEY`, `ENVIRONMENT`, `CORS_ORIGINS`.
      → *R-002*
- [ ] 2.2 Dar valores por defecto de desarrollo para que arranque sin
      configurar nada.
      → *R-002*
- [ ] 2.3 Crear `.env.example` con todas las variables y **sin valores
      reales**.
      → *R-002*, *R-003*

### R-003 — Secretos fuera del repositorio

- [ ] 3.1 Confirmar que `.env` está en `.gitignore` y que `.env.example`
      queda versionado.
      → *R-003*
- [ ] 3.2 Hacer que el backend falle de forma explícita si falta una variable
      obligatoria en producción.
      → *R-003*

### R-004 — Backend FastAPI mínimo

- [ ] 4.1 Crear `backend/` con `pyproject.toml` y el paquete de la aplicación.
      → *R-004*
- [ ] 4.2 Implementar `GET /api/health` con comprobación de la conexión a
      PostgreSQL.
      → *R-004*
- [ ] 4.3 Configurar el prefijo `/api` y CORS para el puerto del frontend.
      → *R-004*
- [ ] 4.4 Verificar que `/docs` responde en desarrollo.
      → *R-004*

### R-005 — Frontend React mínimo

- [ ] 5.1 Crear `frontend/` con Vite + React en **JavaScript** (sin
      TypeScript).
      → *R-005*
- [ ] 5.2 Configurar Tailwind con los tokens base: fuente 16px, escala de
      colores con contraste 4.5:1, objetivos de 44×44px.
      → *R-005*
- [ ] 5.3 Crear la página inicial con `lang="es"` y un encabezado correcto.
      → *R-005*
- [ ] 5.4 Verificar que `npm run build` termina sin errores.
      → *R-005*

### R-006 — Arranque con un solo comando

- [ ] 6.1 Añadir los servicios `backend` y `frontend` al `docker-compose.yml`
      con su comando de arranque.
      → *R-006*
- [ ] 6.2 Escribir el `README.md` de la raíz: requisitos, arranque, pruebas y
      estructura de carpetas.
      → *R-006*, *R-007*
- [ ] 6.3 Crear el `README.md` de `backend/` y de `frontend/`.
      → *R-007*

### R-007 — Estructura de carpetas definida

- [ ] 7.1 Crear la estructura `backend/`, `frontend/`, `data/`, `Docs/`.
      → *R-007*
- [ ] 7.2 Documentar la estructura y por qué existe cada carpeta.
      → *R-007*

## Verificación de la spec

- [ ] V.1 `docker compose up` levanta los tres servicios sin error.
- [ ] V.2 `GET /api/health` devuelve `200` y confirma la conexión.
- [ ] V.3 `npm run build` termina sin errores.
- [ ] V.4 La página inicial declara `lang="es"`.
- [ ] V.5 `.env` no aparece en `git status`.
- [ ] V.6 `git grep` no encuentra ninguna contraseña real.
- [ ] V.7 El `README.md` permite arrancar el proyecto sin contexto previo.

## Notas

- La configuración de Tailwind de la tarea 5.2 es un adelanto de la spec 006:
  aquí solo se exigen los valores base. El sistema completo de tokens
  accesibles se desarrolla en la 006.
- El `SECRET_KEY` de la tarea 2.1 lo usará la spec 003 para firmar las
  sesiones. En desarrollo vale un valor por defecto; en producción es
  obligatorio.
- Al terminar, merge a `main` y actualizar el índice de `Docs/specs/README.md`.