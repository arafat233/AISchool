FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/transport-service/ apps/transport-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/transport-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/transport-service/dist ./apps/transport-service/dist
COPY --from=builder /app/apps/transport-service/package.json ./apps/transport-service/package.json
EXPOSE 3014
CMD ["node", "apps/transport-service/dist/main.js"]
