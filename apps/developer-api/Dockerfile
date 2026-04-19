FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --frozen-lockfile
COPY --from=builder /app/dist ./dist
EXPOSE 3023
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3023/v1/health || exit 1
CMD ["node", "dist/main"]
