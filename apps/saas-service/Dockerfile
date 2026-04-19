FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/saas-service/ apps/saas-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/saas-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/saas-service/dist ./apps/saas-service/dist
COPY --from=builder /app/apps/saas-service/package.json ./apps/saas-service/package.json
EXPOSE 3022
CMD ["node", "apps/saas-service/dist/main.js"]
