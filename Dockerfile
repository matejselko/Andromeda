FROM node:20-alpine

RUN addgroup -S andromeda && adduser -S andromeda -G andromeda

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/
COPY frontend/ ./frontend/

RUN mkdir -p /data && chown andromeda:andromeda /data

USER andromeda

EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "backend/server.js"]
