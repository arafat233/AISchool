FROM node:20-alpine AS base
RUN npm install -g pnpm@9

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/student-portal/package.json ./apps/student-portal/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/student-portal/node_modules ./apps/student-portal/node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @school-erp/student-portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/student-portal/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/student-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/student-portal/.next/static ./.next/static
USER nextjs
EXPOSE 4002
ENV PORT=4002
CMD ["node", "server.js"]
