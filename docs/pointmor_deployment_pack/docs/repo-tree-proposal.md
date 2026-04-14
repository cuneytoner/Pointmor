# Pointmor İçin Önerilen Repo Ağacı

Aşağıdaki ağaç, mevcut monorepo yapısını koruyarak deploy ve CI/CD için gerekli dosyaları ekler.

```text
pointmor/
  package.json
  package-lock.json
  .gitignore
  .github/
    workflows/
      ci.yml
      deploy-demo.yml
  apps/
    api/
      Dockerfile
      package.json
      prisma/
        schema.prisma
        migrations/
        seed.ts
      src/
      .env.example
    admin-web/
      Dockerfile
      package.json
      src/
      public/
      .env.example
  infra/
    docker/
      docker-compose.demo.yml
      .env.demo.example
    scripts/
      deploy-demo.sh
      migrate-demo.sh
      seed-demo.sh
      healthcheck-demo.sh
  docs/
    demo-deployment.md
    runbooks/
      demo-rollback.md
      first-time-setup.md
```

## Dosya rolleri

### `.github/workflows/ci.yml`
- lint
- build
- Prisma doğrulama
- i18n doğrulama

### `.github/workflows/deploy-demo.yml`
- image build/push
- demo VM deploy
- migrate deploy
- health check

### `apps/api/Dockerfile`
- API için production image

### `apps/admin-web/Dockerfile`
- Admin web için production image

### `infra/docker/docker-compose.demo.yml`
- demo DB + API + web + Cloudflare tunnel stack'i

### `infra/scripts/*`
- deploy, migration, seed ve health check için operasyonel script'ler

## İsimlendirme notu

İstersen `infra/` yerine `ops/` kullanabilirsin. Ben `infra/` adını Docker, env ve script paketlerini tek yerde toplamak için öneriyorum.
