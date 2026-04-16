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
COPY packages/events/package.json ./packages/events/
COPY apps/academic-service/package.json ./apps/academic-service/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/academic-service/ ./apps/academic-service/
RUN pnpm --filter @school-erp/database db:generate && pnpm --filter @school-erp/academic-service build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/academic-service/dist ./apps/academic-service/dist
EXPOSE 3004
CMD ["node", "apps/academic-service/dist/main.js"]
