# Pointmor Repo İçi Önerilen Dosya Ağacı

```text
/
  package.json
  package-lock.json
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
        seed.ts
      src/
      .env.example
    admin-web/
      Dockerfile
      package.json
      src/
      public/
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
    demo-deployment-runbook.md
    pointmor-cicd-plan.md
```

## Neden bu yapı?

- `apps/*` mevcut monorepo düzenini korur
- `infra/docker` demo deploy dosyalarını koddan ayırır
- `infra/scripts` sunucu ve CI tarafından ortak kullanılabilir
- `.github/workflows` CI/CD’yı repo içinde görünür kılar

## Önerilen ek npm scriptleri

Kök `package.json` veya ilgili workspace içinde aşağıdakiler faydalı olur:

```json
{
  "scripts": {
    "lint": "npm run lint -ws --if-present",
    "build": "npm run build -ws --if-present",
    "db:generate": "npm --workspace apps/api run db:generate",
    "db:migrate:deploy": "npm --workspace apps/api run db:migrate:deploy",
    "db:seed:demo": "npm --workspace apps/api run db:seed:demo",
    "check:i18n": "npm --workspace apps/admin-web run check:i18n"
  }
}
```

> Script adlarını mevcut repodaki gerçek script isimleriyle hizalayın.
