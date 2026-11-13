FROM node:22-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install

COPY . .

RUN npm run prisma:generate
RUN npm run build

EXPOSE 3333

CMD ["sh", "-c", "npx prisma generate && npm run start:dev"]
