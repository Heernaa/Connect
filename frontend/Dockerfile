FROM node:24-alpine

WORKDIR /app

# Las dependencias se instalan antes que el código para que la capa se reutilice
# mientras no cambie el package.json.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]