FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/ packages/
COPY apps/report-service/ apps/report-service/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @school-erp/report-service build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
# Install chromium for Puppeteer PDF rendering
RUN apk add --no-cache chromium
ENV CHROMIUM_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/report-service/dist ./apps/report-service/dist
COPY --from=builder /app/apps/report-service/package.json ./apps/report-service/package.json
EXPOSE 3021
CMD ["node", "apps/report-service/dist/main.js"]
