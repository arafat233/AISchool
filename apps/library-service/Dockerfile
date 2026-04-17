FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/library-service/ apps/library-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/library-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/library-service/dist ./apps/library-service/dist
COPY --from=builder /app/apps/library-service/package.json ./apps/library-service/package.json
EXPOSE 3016
CMD ["node", "apps/library-service/dist/main.js"]
