FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/hr-service/ apps/hr-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/hr-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/hr-service/dist ./apps/hr-service/dist
COPY --from=builder /app/apps/hr-service/package.json ./apps/hr-service/package.json
EXPOSE 3010
CMD ["node", "apps/hr-service/dist/main.js"]
