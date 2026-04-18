FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/ops-service/ apps/ops-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/ops-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/ops-service/dist ./apps/ops-service/dist
COPY --from=builder /app/apps/ops-service/package.json ./apps/ops-service/package.json
EXPOSE 3020
CMD ["node", "apps/ops-service/dist/main.js"]
