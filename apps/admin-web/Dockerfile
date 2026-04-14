# syntax=docker/dockerfile:1
# Monorepo kökünden: docker build -f apps/admin-web/Dockerfile .
# VITE_API_BASE_URL: tarayıcının çağıracağı API kök URL (sonda / yok).

FROM node:20-bookworm-slim AS build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/admin-web/package.json apps/admin-web/
COPY apps/api/package.json apps/api/
RUN npm ci
COPY apps/admin-web ./apps/admin-web
RUN npm run build -w admin-web

FROM nginx:1.27-alpine AS runtime
COPY infra/docker/admin-web.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
