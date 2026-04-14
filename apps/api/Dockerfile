# syntax=docker/dockerfile:1
# Monorepo kökünden: docker build -f apps/api/Dockerfile .
#
# Üretim imajı: yalnızca apps/api. --omit=dev ile api postinstall atlanır; prisma generate ayrı çalıştırılır.

FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/admin-web/package.json apps/admin-web/
RUN npm ci
COPY apps/api ./apps/api
RUN npm run build -w api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY apps/admin-web/package.json apps/admin-web/
RUN npm ci --omit=dev --ignore-scripts

RUN npm install prisma@7.7.0 --no-save --workspace=api \
  && cd apps/api && npx prisma generate

COPY --from=build /app/apps/api/dist ./apps/api/dist

COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
