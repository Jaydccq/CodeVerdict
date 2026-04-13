# ─── Stage 1: Build Vue 3 client ──────────────────────────────────────────────
FROM node:22-alpine AS client-builder
WORKDIR /build/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ─── Stage 2: Build NestJS server ─────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /build/server
# bcrypt requires native compilation; build tools are only needed at build time
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build; test -f dist/main.js && npm prune --omit=dev

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS production

# libstdc++ is required at runtime by bcrypt's native binding (compiled with g++)
RUN apk add --no-cache libstdc++

# Run as a non-root user
RUN addgroup -S app && adduser -S app -G app

WORKDIR /app

# Server runtime (compiled JS + pruned node_modules)
COPY --from=builder --chown=app:app /build/server/dist         ./server/dist
COPY --from=builder --chown=app:app /build/server/node_modules ./server/node_modules
COPY --chown=app:app server/package.json                        ./server/package.json

# Client static files (served by NestJS)
COPY --from=client-builder --chown=app:app /build/client/dist  ./server/public

USER app
WORKDIR /app/server
EXPOSE 3000

# Verify the app is responding; 30s start period gives migrations time to run
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api || exit 1

CMD ["node", "dist/main"]
