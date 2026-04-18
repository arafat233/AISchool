FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/expense-service/ apps/expense-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/expense-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/expense-service/dist ./apps/expense-service/dist
COPY --from=builder /app/apps/expense-service/package.json ./apps/expense-service/package.json
EXPOSE 3018
CMD ["node", "apps/expense-service/dist/main.js"]
