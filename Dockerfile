FROM node:20-bookworm-slim AS base

WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm install

COPY server ./server
COPY client ./client

RUN cd client && npm run build

WORKDIR /app/server

ENV NODE_ENV=production \
    JUDGE0_URL=https://ce.judge0.com \
    JUDGE0_COMPILE_ONCE=false \
    JUDGE0_WAIT_ON_START=true

EXPOSE 3000

CMD ["node", "src/server.js"]
