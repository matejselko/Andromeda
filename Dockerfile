FROM node:20-alpine

# Install openssl for self-signed cert generation
RUN apk add --no-cache openssl

RUN addgroup -S andromeda && adduser -S andromeda -G andromeda

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/
COPY frontend/ ./frontend/

# /data holds vault.enc AND certs/ — both owned by andromeda user
RUN mkdir -p /data/certs && chown -R andromeda:andromeda /data && \
    chown -R andromeda:andromeda /app

USER andromeda

EXPOSE 3000 3001

VOLUME ["/data"]

# Health check hits HTTPS — ignore cert verification
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- --no-check-certificate https://localhost:3000/api/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "backend/server.js"]
