# Production environment reference (Pointmor)

Bu doküman production ortamı için zorunlu/opsiyonel environment değişkenlerini ve altyapı beklentilerini netleştirir.

Demo odaklı dosyalar:

- `infra/docker/.env.demo.example`
- `docs/40-guide-004-demo-deployment.md`
- `docs/40-guide-005-demo-deployment-runbook.md`

Production için:

- `infra/docker/.env.prod.example`
- `infra/docker/docker-compose.prod.yml`
- `infra/scripts/preflight-prod-env.sh`

---

## 1) Production altyapı beklentileri

| Alan | Production beklentisi |
|------|------------------------|
| DB | Managed PostgreSQL veya HA PostgreSQL (backup + PITR açık) |
| Shared state | **Redis zorunlu** (`SECURITY_STATE_BACKEND=redis`) |
| Storage | Logo/PDF/static için kalıcı object storage + lifecycle policy |
| Domain/TLS | `api.<domain>` + `app.<domain>` + müşteri domainleri; TLS full strict |
| Reverse proxy | API/Admin servisleri private bind (`127.0.0.1`) + TLS terminasyonu LB/proxy’de |
| Secrets | Secret manager / CI environment secrets; repo içinde yok |

> Not: Tek node + memory fallback production standardı değildir. Strict profile bu durumu geçici/emergency penceresi olarak ele alır.

---

## 2) Zorunlu değişkenler

Bu değişkenler boş ise deploy yapılmamalıdır:

- `POINTMOR_API_IMAGE`
- `POINTMOR_ADMIN_IMAGE`
- `DATABASE_URL`
- `REDIS_URL`
- `COOKIE_SECRET`
- `CUSTOMER_PORTAL_JWT_SECRET`
- `POINTMOR_PREFLIGHT_SECRET`
- `WEBHOOK_SIGNING_SECRET`
- `CORS_ORIGINS`
- `PUBLIC_API_BASE_URL`
- `CUSTOMER_PORTAL_JTI_REQUIRED_AFTER`
- `CUSTOMER_BEARER_LEGACY_SUNSET_AFTER`
- `INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT`
- `SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT`

`infra/scripts/preflight-prod-env.sh` bu seti doğrular.

---

## 3) Güvenlik policy zorunluları (production)

| Değişken | Beklenen değer |
|----------|----------------|
| `APP_ENV` | `production` |
| `NODE_ENV` | `production` |
| `SECURITY_STATE_BACKEND` | `redis` |
| `SECURITY_STATE_ALLOW_MEMORY_FALLBACK` | `false` |
| `SECURITY_STATE_ACK_IN_PROCESS_MEMORY` | `false` |
| `CUSTOMER_SESSION_MODE` | `cookie` |
| `CUSTOMER_ALLOW_BEARER_FALLBACK` | `false` |
| `WEBHOOK_AUTH_MODE` | `hmac` |
| `WEBHOOK_ALLOW_LEGACY_SECRET` | `false` |
| `INTERNAL_JOB_REQUIRE_HMAC` | `true` |
| `INTERNAL_JOB_REQUIRE_TIMESTAMP` | `true` |
| `POINTMOR_PREFLIGHT_ALLOW_QUERY` | `false` |
| `RUN_MIGRATIONS_ON_START` | `false` (pipeline’da explicit migrate) |

---

## 4) Internal job / webhook secret seti

### Internal jobs

- `RETENTION_JOB_SECRET` (retention job kullanılıyorsa)
- `HQ_INSIGHT_JOB_SECRET` (hq insight job kullanılıyorsa)
- `INTERNAL_JOB_REQUIRE_HMAC=true`
- `INTERNAL_JOB_TIMESTAMP_SKEW_SEC=300`

HMAC imzalama örneği için:

- `infra/scripts/sign-internal-job-request.sh`

### Webhooks

- `WEBHOOK_SIGNING_SECRET`
- `WEBHOOK_AUTH_MODE=hmac`
- `WEBHOOK_TIMESTAMP_SKEW_SEC=300`

---

## 5) Rotation basics (minimum)

| Secret | Rotation önerisi |
|--------|------------------|
| `COOKIE_SECRET` | 90 gün |
| `CUSTOMER_PORTAL_JWT_SECRET` | 90 gün |
| `POINTMOR_PREFLIGHT_SECRET` | 60-90 gün |
| `WEBHOOK_SIGNING_SECRET` | sağlayıcı cutover planına göre |
| Internal job secretleri | 60-90 gün |
| `DATABASE_URL` credential | platform politikasına göre |
| `REDIS_URL` credential | platform politikasına göre |

Rotation sonrası zorunlu kontroller:

1. `/health` + preflight (`/health?securitySummary=1`) başarılı.
2. Internal job HMAC çağrısı başarılı.
3. Webhook imza doğrulaması başarılı.
4. Smoke adımları başarılı.

---

## 6) Demo vs production farkları (özet)

| Konu | Demo | Production |
|------|------|------------|
| Compose | local build (`build:`) | immutable image (`image: tag@digest`) |
| DB | compose içi postgres | external/managed postgres |
| Redis | opsiyonel profil | zorunlu |
| Seed | var (`seed-demo`, `seed-full-demo`) | yok |
| Migrate | startup + script | explicit deploy adımı |
| Cloudflare tunnel | demo kolay erişim | kurumsal ingress / LB / WAF |
| Secrets | `.env.demo` | secret manager + protected environments |

---

## 7) Production env doğrulama komutu

```bash
ENV_FILE=infra/docker/.env.prod ./infra/scripts/preflight-prod-env.sh
```

PASS almadan deploy etmeyin.
