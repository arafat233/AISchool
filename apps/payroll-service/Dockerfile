FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/payroll-service/ apps/payroll-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/payroll-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/payroll-service/dist ./apps/payroll-service/dist
COPY --from=builder /app/apps/payroll-service/package.json ./apps/payroll-service/package.json
EXPOSE 3011
CMD ["node", "apps/payroll-service/dist/main.js"]
