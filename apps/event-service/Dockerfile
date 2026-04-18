FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/event-service/ apps/event-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/event-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/event-service/dist ./apps/event-service/dist
COPY --from=builder /app/apps/event-service/package.json ./apps/event-service/package.json
EXPOSE 3017
CMD ["node", "apps/event-service/dist/main.js"]
