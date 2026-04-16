# ─── Stage 1: Dependencies ──────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/logger/package.json ./packages/logger/
COPY packages/errors/package.json ./packages/errors/
COPY packages/utils/package.json ./packages/utils/
COPY packages/events/package.json ./packages/events/
COPY apps/auth-service/package.json ./apps/auth-service/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM deps AS builder
COPY packages/ ./packages/
COPY apps/auth-service/ ./apps/auth-service/
RUN pnpm --filter @school-erp/database db:generate
RUN pnpm --filter @school-erp/auth-service build

# ─── Stage 3: Production image ───────────────────────────────────────────────
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/auth-service/dist ./apps/auth-service/dist
COPY --from=builder /app/apps/auth-service/package.json ./apps/auth-service/
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["node", "apps/auth-service/dist/main.js"]

# ─── Stage 4: Development (hot reload) ───────────────────────────────────────
FROM deps AS development
ENV NODE_ENV=development
COPY packages/ ./packages/
COPY apps/auth-service/ ./apps/auth-service/
EXPOSE 3001
CMD ["pnpm", "--filter", "@school-erp/auth-service", "dev"]
