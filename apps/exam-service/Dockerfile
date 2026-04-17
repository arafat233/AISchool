FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/database/package.json ./packages/database/
COPY packages/types/package.json ./packages/types/
COPY packages/errors/package.json ./packages/errors/
COPY packages/logger/package.json ./packages/logger/
COPY packages/utils/package.json ./packages/utils/
COPY packages/events/package.json ./packages/events/
COPY apps/exam-service/package.json ./apps/exam-service/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY packages/ ./packages/
COPY apps/exam-service/ ./apps/exam-service/
RUN pnpm --filter @school-erp/database db:generate && pnpm --filter @school-erp/exam-service build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# Install Chromium for Puppeteer-based PDF generation
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/exam-service/dist ./apps/exam-service/dist
EXPOSE 3008
CMD ["node", "apps/exam-service/dist/main.js"]
