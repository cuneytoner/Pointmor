# syntax=docker/dockerfile:1
# Monorepo kökünden: docker build -f apps/admin-web/Dockerfile .
# VITE_API_BASE_URL: tarayıcının çağıracağı API kök URL (sonda / yok).

FROM node:20-bookworm-slim AS build
ARG VITE_API_BASE_URL
ARG VITE_ADMIN_SESSION_COOKIES_ONLY
ARG VITE_CUSTOMER_SESSION_COOKIES_ONLY
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ADMIN_SESSION_COOKIES_ONLY=${VITE_ADMIN_SESSION_COOKIES_ONLY}
ENV VITE_CUSTOMER_SESSION_COOKIES_ONLY=${VITE_CUSTOMER_SESSION_COOKIES_ONLY}
WORKDIR /app

# npm ci tüm workspace’leri kurar; api postinstall (prisma generate) için OpenSSL + şema gerekir
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/admin-web/package.json apps/admin-web/
COPY apps/api/package.json apps/api/
COPY packages/pointmor-rbac/package.json packages/pointmor-rbac/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/prisma.config.ts ./apps/api/prisma.config.ts

RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/pointmor_build" npm ci
COPY apps/admin-web ./apps/admin-web
COPY packages/pointmor-rbac ./packages/pointmor-rbac
RUN npm run build -w @pointmor/rbac && npm run build -w admin-web

FROM nginx:1.27-alpine AS runtime
COPY infra/docker/admin-web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
