# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/admin-web/package*.json apps/admin-web/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm --workspace apps/admin-web run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/html
EXPOSE 80
