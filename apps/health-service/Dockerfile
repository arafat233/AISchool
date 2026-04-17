FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/health-service/ apps/health-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/health-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/health-service/dist ./apps/health-service/dist
COPY --from=builder /app/apps/health-service/package.json ./apps/health-service/package.json
EXPOSE 3015
CMD ["node", "apps/health-service/dist/main.js"]
