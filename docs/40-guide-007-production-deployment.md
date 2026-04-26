# Production dağıtım rehberi (Pointmor)

Bu kılavuz, Pointmor’u production’da güvenli şekilde canlıya alma akışını tanımlar.

İlgili dosyalar:

- Env: `docs/40-guide-006-production-env.md`
- Çalıştırma rehberi: `docs/40-guide-008-production-runbook.md`
- Prod compose: `infra/docker/docker-compose.prod.yml`
- Prod deploy script: `infra/scripts/deploy-prod.sh`
- Prod env preflight: `infra/scripts/preflight-prod-env.sh`

---

## 1) Önerilen CI/CD modeli

### PR geçidi

1. `CI` workflow (lint + prisma validate/generate + tests + build)
2. Required checks: `CI / check`
3. Branch protection: `main` direct push kapalı, PR review zorunlu

### Release artifact

1. `.github/workflows/release-images.yml`
2. API + admin image GHCR push
3. SHA traceability: `sha-<commit>` tag (digest önerilir ancak zorunlu enforce edilmez)
4. `release-manifest.json` artifact

### Production dağıtımı

1. `.github/workflows/deploy-production.yml` (manual dispatch)
2. `environment: production` (manual approval gate)
3. Hedef hosta SSH deploy (`deploy-prod.sh`)

---

## 2) Production başlangıç kontrol listesi

- [ ] `infra/docker/.env.prod` hazır ve `preflight-prod-env.sh` PASS
- [ ] `POINTMOR_API_IMAGE` ve `POINTMOR_ADMIN_IMAGE` image referansları açıkça seçildi
- [ ] DB backup/PITR doğrulandı
- [ ] Redis erişilebilir ve credential doğrulandı
- [ ] `INTERNAL_JOB_REQUIRE_HMAC=true`
- [ ] `WEBHOOK_AUTH_MODE=hmac`
- [ ] `POINTMOR_PREFLIGHT_SECRET` set edildi
- [ ] `POINTMOR_PREFLIGHT_ALLOW_QUERY=false`
- [ ] rollout cut-off tarihleri güncel/gerçekçi
- [ ] `RUN_MIGRATIONS_ON_START=false`

---

## 3) İlk production dağıtım kontrol listesi

1. Release commit SHA belirle.
2. `Release images` workflow ile image üret/push et.
3. Manifestte image reflerini doğrula (pratikte tag tabanlı; digest önerilir).
4. Production environment approval al.
5. `Deploy production` workflow çalıştır:
   - `release_sha`
   - (opsiyonel) `api_image`, `admin_image`
6. Deploy sonrası:
   - `/health`
   - `/health?securitySummary=1` (header secret ile)
   - admin login + bootstrap
   - customer public session basic flow
7. Runbook’ta “cutover sonrası doğrulama” adımlarını tamamla.

---

## 4) Migration safety policy

Production’da migration için policy:

1. Migration adımı deploy pipeline’da explicit çalışır (`deploy-prod.sh`).
2. `RUN_MIGRATIONS_ON_START=false` olmalı.
3. Failure olursa app up adımına geçilmez.
4. Rollback için öncelik **forward-fix**; DB geri alma yalnız onaylı bakım penceresiyle.

Ek zorunlular:

- Production’da `db:reset` **yasak**.
- Production’da `db:seed:demo` ve `db:seed:full:demo` **yasak**.
- Demo ile production veritabanı paylaşımı **yasak**.

Neden:

- Startup sırasında implicit migration, ölçekli/çok instance ortamlarda kontrolsüz davranışa yol açar.
- Explicit migration adımı deploy safety ve gözlemlenebilirlik sağlar.

---

## 5) Smoke ve promote mantığı

Promote/başarılı deploy kabulü için minimum smoke:

1. API health
2. Security preflight summary
3. Admin auth/login
4. Tenant bootstrap
5. Internal job HMAC çağrısı (dry-run)
6. (Varsa) webhook test event

Bu adımların herhangi biri fail ise deploy “successful” kabul edilmemelidir.

---

## 5.1 Özet production deploy akışı

1. Production env preflight PASS al.
2. Release image referansını doğrula (tag tabanlı çalışma mevcut; digest önerilir).
3. Explicit `migration` adımını çalıştır.
4. Deploy adımını çalıştır.
5. Smoke + health doğrula.
6. Gerekirse rollback kararını runbook sırasıyla uygula.

---

## 6) Yanlış env ile deploy’u önleme

Önleyici kontroller:

- `preflight-prod-env.sh` zorunlu
- `environment: production` approval gate
- required secrets check (`deploy-production.yml`)
- production compose ayrı dosya (`docker-compose.prod.yml`)

Ek öneri:

- Production hostta `.env.prod` dosyası read-only ve audit loglu süreçle güncellensin.

---

## 7) Artifact traceability standardı

Her deploy için saklanması gereken minimum metadata:

- git `release_sha`
- API image ref (`tag` zorunlu, `digest` önerilir)
- admin image ref (`tag` zorunlu, `digest` önerilir)
- deploy zamanı (UTC)
- runbook operator ve change request ID

`deploy-prod.sh` sonrası:

- `infra/docker/.release-manifest.prod.json` güncellenir.

---

## 8) Branch/env protection beklentileri

- `main` branch protection:
  - required checks: CI
  - required review: min 1-2
  - force push kapalı
- GitHub `production` environment:
  - manual approval
  - deploy secretleri sadece bu environment altında
  - mümkünse wait timer + restricted approvers

---

## 8.1 Image seçimi kuralı

- Production deploy adımında image seçimi zorunludur.
- `git checkout` yalnız deploy scripti/compose sürümünü belirler; çalışan image’i tek başına belirlemez.
- Çalışacak image referansı (`POINTMOR_API_IMAGE`, `POINTMOR_ADMIN_IMAGE`) explicit seçilmelidir.

---

## 9) Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerde aynı PR/task içinde bu dokümanı güncelle:

- deploy/migrate scriptleri
- release image üretim/etiketleme akışı
- smoke adımları
- rollback kuralları
- env var adları ve policy kuralları
