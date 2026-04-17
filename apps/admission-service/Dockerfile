FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/admission-service/ apps/admission-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/admission-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/admission-service/dist ./apps/admission-service/dist
COPY --from=builder /app/apps/admission-service/package.json ./apps/admission-service/package.json
EXPOSE 3013
CMD ["node", "apps/admission-service/dist/main.js"]
