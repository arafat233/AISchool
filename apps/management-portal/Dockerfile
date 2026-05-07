FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/management-portal/package.json ./apps/management-portal/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/management-portal/node_modules ./apps/management-portal/node_modules || true
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @school-erp/management-portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/management-portal/public ./public 2>/dev/null || true
COPY --from=builder --chown=nextjs:nodejs /app/apps/management-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/management-portal/.next/static ./.next/static
USER nextjs
EXPOSE 4004
ENV PORT=4004
CMD ["node", "server.js"]
