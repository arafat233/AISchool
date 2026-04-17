FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/parent-portal/package.json ./apps/parent-portal/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/parent-portal/node_modules ./apps/parent-portal/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @school-erp/parent-portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/parent-portal/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/parent-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/parent-portal/.next/static ./.next/static
USER nextjs
EXPOSE 3013
ENV PORT=3013
CMD ["node", "server.js"]
