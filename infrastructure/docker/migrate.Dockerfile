FROM node:20-alpine
RUN npm install -g pnpm@9
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile
COPY packages/database ./packages/database
RUN pnpm --filter @school-erp/database prisma generate
CMD ["pnpm", "--filter", "@school-erp/database", "prisma", "migrate", "deploy"]
