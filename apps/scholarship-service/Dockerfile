FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/scholarship-service/ apps/scholarship-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/scholarship-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/scholarship-service/dist ./apps/scholarship-service/dist
COPY --from=builder /app/apps/scholarship-service/package.json ./apps/scholarship-service/package.json
EXPOSE 3019
CMD ["node", "apps/scholarship-service/dist/main.js"]
