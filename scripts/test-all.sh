#!/usr/bin/env bash
#
# Toda la suite de Connect con un comando (spec 008 · R-009, §5).
#
#   ./scripts/test-all.sh
#
# Qué ejecuta, en este orden:
#
#   1. `ruff` sobre el backend: los errores de estilo son errores.
#   2. `pytest` sobre el backend: unitarias e integración, contra el PostgreSQL
#      del propio stack. Cada test va en transacción y se deshace al terminar, así
#      que se puede ejecutar con datos de verdad en la base de desarrollo.
#   3. `oxlint` sobre el frontend.
#   4. `vitest`: unitarias de componentes, validadores y diccionario.
#   5. `playwright`: E2E y accesibilidad en ordenador, tablet y móvil. Incluye la
#      auditoría con axe-core: una violación de accesibilidad rompe esta suite
#      igual que rompería un fallo funcional (§4.3).
#   6. `vite build`: el bundle de producción se compila.
#
# **Hace falta el stack levantado** (`docker compose up -d`): los recorridos de
# `frontend/e2e/journeys/` prueban la aplicación real contra la API real.
#
# Todo se ejecuta dentro de los contenedores, no en la máquina: así la suite
# depende solo de Docker, igual que la aplicación (§7.0).

set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Falta Docker. El proyecto entero vive en Docker (§7.0)." >&2
  exit 1
fi

running="$(docker compose ps --status running --services || true)"

for service in db backend frontend; do
  if ! printf '%s\n' "$running" | grep -qx "$service"; then
    echo "El servicio «$service» no está en marcha. Levanta el stack antes:" >&2
    echo "  docker compose up -d" >&2
    exit 1
  fi
done

step() {
  echo
  echo "--- $1"
}

step 'Backend: estilo (ruff)'
docker compose exec -T backend ruff check .

step 'Backend: unitarias e integración (pytest)'
docker compose exec -T backend pytest

step 'Frontend: estilo (oxlint)'
docker compose exec -T frontend npm run lint

step 'Frontend: unitarias (vitest)'
docker compose exec -T frontend npm test

step 'Frontend: E2E y accesibilidad en los tres dispositivos (playwright)'
docker compose exec -T frontend npm run test:e2e

step 'Frontend: compilación de producción'
docker compose exec -T frontend npm run build

echo
echo "Suite completa en verde."