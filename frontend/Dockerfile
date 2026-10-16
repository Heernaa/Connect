FROM node:24-bookworm-slim

WORKDIR /app

# Las dependencias se instalan antes que el código para que la capa se reutilice
# mientras no cambie el package.json.
COPY package.json package-lock.json ./
RUN npm ci

# El navegador de Playwright, y solo chromium: los tres perfiles de dispositivo
# cambian la ventana y el tacto, no el motor (§7.1). Va en la imagen para que la
# suite E2E y de accesibilidad se pueda ejecutar **dentro** del contenedor, con
# `scripts/test-all.sh`, sin pedirle a la máquina nada más que Docker (§7.0).
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
