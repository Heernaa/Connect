# backend — API de Connect

FastAPI. Aquí viven la **validación y la puntuación** de los juegos: el
cliente propone, el servidor decide (§2.1.6, §6.6).

## Estructura

```
app/
  config.py        Configuración leída del entorno (Pydantic Settings)
  main.py          Punto de entrada: prefijo /api, CORS, routers
  db/session.py    Motor de SQLAlchemy
  routers/         Rutas agrupadas por dominio
tests/             Pruebas con pytest
```

Un archivo que pase de ~300 líneas pide descomponerse (§3.3).

## Arranque

Dentro de Docker, `docker compose up` ya lo levanta en
<http://localhost:8000>. La documentación interactiva está en
<http://localhost:8000/docs> **solo fuera de producción**: describe toda la
superficie de la API y no debe quedar publicada por accidente (§6.1).

## Configuración

Se lee del entorno. Los valores por defecto son de desarrollo y permiten
arrancar sin configurar nada. Copia `.env.example` a `.env` solo si necesitas
cambiar algo.

| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `ENVIRONMENT` | `development`, `test` o `production` | No |
| `DATABASE_URL` | Conexión a PostgreSQL | No |
| `SECRET_KEY` | Firma de las sesiones (spec 003) | **Sí en producción** |
| `CORS_ORIGINS` | Orígenes permitidos, en notación JSON | No |

En `production`, arrancar con la `SECRET_KEY` de desarrollo **detiene el
proceso** con un error explícito. Un despliegue inseguro que arranca en
silencio es peor que uno que se niega a arrancar (§6.1, spec 001 · R-003).

## Pruebas

```bash
docker compose exec backend pytest          # todas
docker compose exec backend pytest -q       # resumen
docker compose exec backend ruff check .   # linter
```

Sin Docker, con un entorno virtual:

```bash
uv sync --extra dev
uv run pytest
```

Los tests de integración necesitan PostgreSQL accesible. Si no lo está, se
omiten con un mensaje explícito en lugar de fallar de forma confusa.

## Reglas que no se saltan aquí

- **Contraseñas hasheadas, nunca cifradas** (§6.2). argon2id.
- **Consultas parametrizadas**, nunca SQL construido con strings (§6.1).
- **La puntuación se calcula aquí**, nunca se recibe del cliente (§6.6).
- **Errores en lenguaje llano** para quien los lee, sin códigos técnicos (§4.1).