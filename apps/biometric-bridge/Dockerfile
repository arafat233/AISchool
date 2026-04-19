FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install --frozen-lockfile

COPY src ./src
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

WORKDIR /app

# Only production dependencies
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile

COPY --from=builder /app/dist ./dist

# Health check via the HTTP server started by HealthMonitor on :8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

EXPOSE 8080

CMD ["node", "dist/index.js"]
