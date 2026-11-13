FROM node:22-bookworm-slim AS base

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

EXPOSE 3001

CMD ["npm", "run", "dev"]
