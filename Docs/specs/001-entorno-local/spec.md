# Spec 001 — Entorno local

**Estado:** pendiente
**Fase:** 1 de 7
**Constitución:** §7.0 (entorno local), §3 (estándares de código)

## 1. Propósito

Este proyecto es una plataforma web de juegos sencillos pensada para personas
mayores, donde el eje no es el juego en sí sino la **conexión social**: ver la
puntuación del resto, chatear y tener compañía. La aplicación se juega en el
navegador, con la lógica de los juegos en el cliente y la validación y la
puntuación siempre en el servidor.

Esta spec construye el esqueleto del proyecto: un entorno que arranque en la
máquina del desarrollador con un solo comando, el esqueleto del backend en
FastAPI, el del frontend en React, y la configuración compartida entre ambos.
Nada de esto es visible para el usuario final; es la base sobre la que se
construirán las specs 002 a 006.

## 2. Alcance

**Incluye:**

- `docker compose` con PostgreSQL para desarrollo local.
- Esqueleto de FastAPI con configuración por entorno.
- Esqueleto de React + Tailwind con JavaScript.
- `.env.example` y carga de variables de entorno.
- Endpoint de salud para verificar que la API responde.
- `.gitignore` y documentación de arranque.

**Fuera de alcance:**

- Modelos de datos y migraciones (spec 002).
- Autenticación (spec 003).
- Cualquier endpoint de juegos (specs 004 y 005).
- Despliegue: el proyecto **no se despliega**, vive en local (§7.0).

## 3. Requisitos

### R-001 — PostgreSQL local reproducible

La base de datos de desarrollo debe levantarse con `docker compose up` sin
depender de una instalación local de PostgreSQL.

- Imagen oficial de PostgreSQL con versión fijada en el `compose.yaml`.
- Base de datos `connect`, usuario y contraseña de desarrollo.
- Puerto expuesto en `5432`.
- Volumen persistente para que los datos sobrevivan a un reinicio.
- El proyecto **arranca sin ninguna credencial externa** (§7.0).

### R-002 — Configuración por entorno

El backend lee su configuración de variables de entorno, nunca de valores
escritos en el código.

- Variables con prefijo identificable (por ejemplo `DATABASE_URL`).
- Valores por defecto de desarrollo para que arranque sin configurar nada.
- `.env.example` versionado con las variables y **sin valores secretos**.
- `.env` ignorado por git.

### R-003 — Secretos fuera del repositorio

Ningún secreto se escribe en el código ni se versiona.

- `.env` está en `.gitignore`.
- `.env.example` no contiene valores reales, solo nombres y ejemplos.
- El backend falla de forma explícita si en producción falta una variable
  obligatoria. En desarrollo usa el valor por defecto.

### R-004 — Backend FastAPI mínimo

La API debe arrancar y exponer un endpoint de salud.

- Aplicación FastAPI con prefijo de versión (`/api`).
- `GET /api/health` devuelve `200` con el estado del servicio.
- `GET /api/health` comprueba también la conexión con PostgreSQL y lo indica en
  la respuesta.
- Documentación interactiva disponible en desarrollo (`/docs`).
- CORS configurado para el puerto del frontend en desarrollo.

### R-005 — Frontend React mínimo

El frontend debe arrancar y mostrar una página de inicio.

- React con **JavaScript** (§3.2), sin TypeScript.
- Tailwind CSS configurado con los tokens base (§4.1).
- `npm run dev` sirve la aplicación.
- `npm run build` genera un bundle de producción sin errores.
- La página inicial declara `lang="es"`.

### R-006 — Arranque con un solo comando

El desarrollador debe poder levantar todo el entorno con un comando.

- `docker compose up` levanta PostgreSQL, backend y frontend.
- Un `README.md` en la raíz documenta el arranque paso a paso.
- El README indica también cómo ejecutar las pruebas.

### R-007 — Estructura de carpetas definida

El proyecto tiene una estructura de carpetas estable y documentada.

```
Connect/
  backend/          FastAPI
  frontend/         React + Tailwind
  data/             Contenido de los juegos (seed_v0.sql)
  Docs/             Constitución y especificaciones
```

- Cada carpeta tiene un `README.md` breve explicando su propósito.
- No se crea código fuera de estas carpetas sin justificarlo.

## 4. Criterios de aceptación

- [ ] `docker compose up` levanta los tres servicios sin error.
- [ ] `GET /api/health` devuelve `200` y confirma conexión con la base de datos.
- [ ] `npm run build` en `frontend/` termina sin errores ni avisos bloqueantes.
- [ ] La página inicial de la web muestra `lang="es"`.
- [ ] `.env` no aparece en `git status` tras crearse.
- [ ] `git grep` no encuentra ninguna contraseña real en el repositorio.
- [ ] El `README.md` permite a alguien sin contexto arrancar el proyecto.

## 5. Dependencias y referencias

- **Predecesoras:** ninguna. Es la primera spec.
- **Sucesoras:** 002 (esquema de datos) y 006 (frontend accesible) dependen de
  esta.
- **Constitución:** §3.2 (JavaScript), §7.0 (entorno local), §6.1 (secretos).
- **Contenido de juegos:** `data/seed_v0.sql`, que la spec 002 cargará.