# Pointmor Pre-Alpha CI/CD ve Deployment Planı

## Amaç

Pointmor monorepo'yu, pre-alpha demo amaçlı dış erişime açılabilecek, tekrarlanabilir ve kontrollü bir akışa taşımak.

## Mevcut durum özeti

- Monorepo: npm workspaces
- Uygulamalar:
  - `apps/api`: Fastify + TypeScript + Prisma + PostgreSQL
  - `apps/admin-web`: React + Vite + PWA yüzeyleri
- DB: PostgreSQL
- Redis / queue: yok
- Resmi CI/CD: yok
- Resmi Docker/hosting tanımı: yok

## Hedef ortam modeli

Şimdilik en doğru akış:

- `local`: geliştirici ortamı
- `demo`: Debian VM + Docker Compose + Cloudflare Tunnel
- `prod-lite`: sonraki faz, ayrı host/managed Postgres ile

Not: Bu aşamada ayrı bir `staging` ortamı zorunlu değil.

## Ortam ayrımı

Kural:

- Dev DB asla public expose edilmez.
- Demo için ayrı Postgres container ve ayrı volume kullanılır.
- Seed verisi yalnızca local/demo için tasarlanır.
- Production için demo kullanıcıları, demo şifreleri ve zayıf default secret'lar yasaktır.

## Branch stratejisi

Önerilen sade model:

- `main`: demo deploy'a uygun dal
- `feature/*`: günlük geliştirme

Akış:

`feature/* -> PR -> main -> demo deploy`

## CI yaklaşımı

İlk aşamada CI aşağıdaki kalite kapılarını sağlamalı:

1. `npm ci`
2. lint
3. build
4. Prisma generate/validate odaklı kontrol
5. admin-web i18n doğrulaması

İlk fazda sahte test altyapısı eklenmez. Test framework daha sonra eklenir.

## CD yaklaşımı

İlk faz yalnızca demo ortamına odaklanır.

Main'e merge sonrası önerilen akış:

1. Docker image build
2. Registry'ye push
3. Demo VM üzerinde `docker compose pull`
4. `docker compose up -d`
5. `prisma migrate deploy`
6. Opsiyonel demo seed
7. `/health` ile smoke kontrol

## Seed stratejisi

Önerilen ayrım:

- `db:seed:base`
- `db:seed:demo`

Kurallar:

- Demo seed otomatik her deploy'da çalışmaz.
- İlk kurulum veya manuel tetikleme ile çalışır.
- Şifreler kod içine gömülmez, env ile gelir.

## Secret yönetimi

- Local: `.env`
- Demo VM: `.env.demo`
- GitHub Actions: repository/environment secrets

Örnek secret kategorileri:

- `DATABASE_URL`
- `COOKIE_SECRET`
- `CUSTOMER_PORTAL_JWT_SECRET`
- webhook secret'ları
- Cloudflare tunnel token
- SSH deploy bilgileri

## Demo sunucu mimarisi

Önerilen servisler:

- `postgres-demo`
- `api-demo`
- `admin-web-demo`
- `cloudflared`

Opsiyonel:

- Nginx
- admin/debug araçları yalnızca private erişimde

## Yol haritası

### Faz 1
Deploy edilebilirlik
- Dockerfile'lar
- compose
- env örnekleri
- health check'ler

### Faz 2
CI
- lint
- build
- Prisma kontrolü
- i18n doğrulaması

### Faz 3
Demo CD
- build/push/deploy
- migrate deploy
- health check
- Cloudflare Tunnel

### Faz 4
Test derinliği
- Vitest
- API integration testleri
- Playwright smoke

### Faz 5
Prod-lite
- managed Postgres
- rollback runbook
- backup ve restore planı

## Teknik standart önerileri

- CI/CD: GitHub Actions
- Registry: GitHub Container Registry
- Demo deploy: Docker Compose
- Public erişim: Cloudflare Tunnel
- Tag stratejisi: commit SHA + `demo-latest`
- Rollback: önceki başarılı image tag'e dönüş
