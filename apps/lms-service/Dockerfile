FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/lms-service/ apps/lms-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/lms-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/lms-service/dist ./apps/lms-service/dist
COPY --from=builder /app/apps/lms-service/package.json ./apps/lms-service/package.json
EXPOSE 3009
CMD ["node", "apps/lms-service/dist/main.js"]
