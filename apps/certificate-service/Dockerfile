FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/certificate-service/ apps/certificate-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/certificate-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/certificate-service/dist ./apps/certificate-service/dist
COPY --from=builder /app/apps/certificate-service/package.json ./apps/certificate-service/package.json
EXPOSE 3012
CMD ["node", "apps/certificate-service/dist/main.js"]
