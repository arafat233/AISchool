FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/errors/package.json ./packages/errors/
COPY packages/logger/package.json ./packages/logger/
COPY packages/utils/package.json ./packages/utils/
COPY apps/user-service/package.json ./apps/user-service/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/user-service/ ./apps/user-service/
RUN pnpm --filter @school-erp/database db:generate
RUN pnpm --filter @school-erp/user-service build

FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/user-service/dist ./apps/user-service/dist
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3002/users/health || exit 1
CMD ["node", "apps/user-service/dist/main.js"]

FROM deps AS development
ENV NODE_ENV=development
COPY packages/ ./packages/
COPY apps/user-service/ ./apps/user-service/
EXPOSE 3002
CMD ["pnpm", "--filter", "@school-erp/user-service", "dev"]
