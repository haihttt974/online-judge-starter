# Image (ảnh Docker) chạy toàn bộ phần mềm:
# - Node.js để chạy server/backend
# - gcc/g++ để biên dịch C/C++
# - python3 để chạy Python
# - openjdk để biên dịch/chạy Java
# - mono để biên dịch/chạy C#
# - fpc để biên dịch/chạy Pascal
FROM node:20-bookworm-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    openjdk-17-jdk-headless \
    mono-devel \
    fp-compiler \
    coreutils \
  && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev

COPY client/package*.json ./client/
RUN cd client && npm install

COPY server ./server
COPY client ./client

RUN cd client && npm run build

WORKDIR /app/server

EXPOSE 3000

CMD ["node", "src/server.js"]
