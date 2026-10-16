# Imagen de desarrollo del backend.
FROM python:3.12-slim

# argon2-cffi (spec 003) necesita un compilador o sus ruedas nativas.
RUN apt-get update \
    && apt-get install --no-install-recommends -y build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Las dependencias se instalan antes que el código para que la capa se
# reutilice mientras no cambie el pyproject.toml. El extra `dev` trae pytest,
# httpx y ruff: el backend corre los tests en su propio contenedor (§5).
COPY pyproject.toml ./
RUN pip install --no-cache-dir ".[dev]"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]