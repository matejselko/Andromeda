FROM node:20-alpine

# openssl for TLS cert generation
RUN apk add --no-cache openssl

RUN addgroup -S andromeda && adduser -S andromeda -G andromeda

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

COPY backend/ ./backend/
COPY frontend/ ./frontend/

# /data is the persistent volume (vault + certs)
# Set up ownership — volume mount will preserve this on fresh volumes
RUN mkdir -p /data/certs && chown -R andromeda:andromeda /data /app

USER andromeda

# 3000 = HTTPS (main, exposed in compose)
# 3002 = HTTP health-check (internal only, NOT exposed)
EXPOSE 3000

VOLUME ["/data"]

# Health check hits the plain HTTP health server on 3002 (loopback only).
# - No TLS → no --no-check-certificate needed (works with busybox wget)
# - Starts immediately even before TLS cert is generated
# - start-period=25s gives openssl time to run on first boot
HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/health | grep -q '"status":"ok"' || exit 1

CMD ["node", "backend/server.js"]
