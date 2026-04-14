# Cursor Prompt 01 - Repo'ya Yakın Master Plan

Pointmor monorepo için repo yapısına sadık kalarak demo deploy ve CI/CD altyapısı ekle.

Bağlam:
- npm workspaces monorepo
- apps/api = Fastify + TypeScript + Prisma + PostgreSQL
- apps/admin-web = React + Vite + TypeScript + PWA
- demo ortamı Debian VM + Docker Compose + Cloudflare Tunnel
- demo DB ile dev DB ayrılmalı
- mevcut resmi GitHub Actions yok

İstiyorum:
1. repo içindeki mevcut scriptleri incele
2. eksik ama gerekli minimal scriptleri öner
3. `apps/api/Dockerfile` ve `apps/admin-web/Dockerfile` ekle
4. `infra/docker/docker-compose.demo.yml` ekle
5. `infra/docker/.env.demo.example` ekle
6. `.github/workflows/ci.yml` ve `.github/workflows/deploy-demo.yml` oluştur
7. `infra/scripts/*.sh` deploy scriptlerini ekle
8. `docs/demo-deployment-runbook.md` ekle

Kurallar:
- aşırı mimari değişiklik yapma
- mevcut monorepo yapısını bozma
- secret değerlerini hardcode etme
- demo seed’i production’a taşırma

Teslim şekli:
- önce kısa plan
- sonra dosya bazlı değişiklikler
- en sonda local test ve deploy komutları
