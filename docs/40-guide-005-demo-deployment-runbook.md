# Demo deployment runbook (Pointmor)

Kısa giriş (aynı konu): [`demo-deployment-runbook.md`](./demo-deployment-runbook.md).

Debian VM + Docker Compose + isteğe bağlı Cloudflare Tunnel. Ayrıntılı bağlam: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md).

---

## 1. Ortam değişkenleri (`infra/docker/.env.demo`)

| Değişken | Not |
|----------|-----|
| `POSTGRES_DEMO_USER`, `POSTGRES_DEMO_PASSWORD`, `POSTGRES_DEMO_DB` | Postgres konteyneri; şifre `DATABASE_URL_DEMO` ile aynı olmalı. |
| `POSTGRES_DEMO_PORT` | Host’tan seed için `127.0.0.1` port map (varsayılan `55432`). |
| `DATABASE_URL_DEMO` | Compose içi: `@postgres-demo:5432/...` — özel karakterli şifre → URL-encode. |
| `COOKIE_SECRET`, `CUSTOMER_PORTAL_JWT_SECRET` | Güçlü rastgele; birbirinden farklı. |
| `PUBLIC_API_BASE_URL` | Tarayıcının göreceği API kökü (`https://...`, sonda `/` yok). |
| `CORS_ORIGINS` | Admin + müşteri PWA kökenleri, virgülle. |
| `RUN_MIGRATIONS_ON_START` | `true` → API açılışta migrate (idempotent). |
| `API_HOST_PORT`, `ADMIN_HOST_PORT` | VM’de localhost test portları. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel servisi için; boşsa profil kullanmayın. |
| `DEMO_ADMIN_PASSWORD`, `DEMO_OPERATOR_PASSWORD` | Seed için; ≥12 karakter. `seed-demo.sh` konteyner içinde `DATABASE_URL_DEMO` kullanır. |
| `DATABASE_URL_SEED` | (İsteğe bağlı, yerel CLI) Host’tan doğrudan `npm run db:seed:demo` için localhost URL; `seed-demo.sh` kullanıyorsanız gerekmez. |

### 1.1 Security rollout policy (recommended demo defaults)

- `CUSTOMER_PORTAL_JTI_REQUIRED_AFTER=2026-10-01T00:00:00.000Z`
- `CUSTOMER_BEARER_LEGACY_SUNSET_AFTER=2026-10-15T00:00:00.000Z`
- `INTERNAL_JOB_LEGACY_AUTH_EXPIRES_AT=2026-12-01T00:00:00.000Z`
- `SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT=2026-11-15T00:00:00.000Z`

Notes:
- Dates are UTC ISO 8601 and should be adjusted per rollout calendar.
- `INTERNAL_JOB_REQUIRE_HMAC=true` should be enabled before legacy expiry date.
- In strict profile, memory fallback is treated as temporary emergency mode; keep justification and expiry explicit.

Şablon:

```bash
cp infra/docker/.env.demo.example infra/docker/.env.demo
```

---

## 2. İlk kurulum (VM, bir kez)

```bash
# Repo (örnek yol)
sudo mkdir -p /opt/pointmor-demo && sudo chown "$USER":"$USER" /opt/pointmor-demo
cd /opt/pointmor-demo
git clone <repo-url> .
# veya mevcut klon: git remote add origin … && git pull

cp infra/docker/.env.demo.example infra/docker/.env.demo
nano infra/docker/.env.demo   # CHANGE_ME_* ve alan adlarını doldurun

chmod +x infra/scripts/deploy-demo.sh infra/scripts/migrate-demo.sh \
  infra/scripts/health-check-demo.sh infra/scripts/seed-demo.sh
```

Sunucuda: Docker + Docker Compose plugin; `curl` veya `wget` (health script için).

---

## 3. Deploy

```bash
cd /opt/pointmor-demo   # DEMO_REPO_PATH
git pull origin main
./infra/scripts/deploy-demo.sh
```

Cloudflare tunnel’ı da aynı deploy ile kaldırmak için:

```bash
./infra/scripts/deploy-demo.sh --cloud
```

(`CLOUDFLARE_TUNNEL_TOKEN` dolu olmalı; ayrıntı bölüm 7.)

Ne yapar: `docker compose build` → `up -d` (postgres, api, admin; `--cloud` ile ayrıca `cloudflared`) → `prisma migrate deploy` → `health-check-demo.sh`. **Seed çalıştırmaz.**

---

## 4. Migration (ayrı çalıştırma)

```bash
cd /opt/pointmor-demo
./infra/scripts/migrate-demo.sh
```

API açık değilse önce `./infra/scripts/deploy-demo.sh` veya `docker compose … up -d`.

---

## 5. Seed (yalnız manuel / ilk kurulum)

Otomatik deploy ile **çalıştırılmaz**. `seed-demo.sh`, **`api-demo` konteyneri içinde** seed çalıştırır (sunucuda ekstra Node/npm gerekmez).

`infra/docker/.env.demo` içinde: `DATABASE_URL_DEMO`, `DEMO_ADMIN_PASSWORD`, `DEMO_OPERATOR_PASSWORD` (≥12 karakter). `api-demo` çalışıyor olmalı.

```bash
cd /opt/pointmor-demo
./infra/scripts/seed-demo.sh
```

**Ne yüklenir / yüklenmez:** `seed-demo.sh` → `db:seed:demo` → [`seed-demo.ts`](../apps/api/prisma/seed-demo.ts) (demo hesaplar, `demo-cafe`). Üç ek demo kiracı ve ağır senaryo verisi [`seed-demo-scenarios.ts`](../apps/api/prisma/seed-demo-scenarios.ts) **bu komutla çalışmaz**; yalnızca yerel `npm run db:seed` veya bilinçli `SEED_FULL_DEMO` akışı: [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md).

Full senaryo verisini demo konteyneri içinde çalıştırmak için:

```bash
cd /opt/pointmor-demo/Pointmor
./infra/scripts/seed-full-demo.sh
```

Doğrudan konteyner içinde kısayol komut:

```bash
docker compose -f infra/docker/docker-compose.demo.yml --env-file infra/docker/.env.demo exec -T \
  -e APP_ENV=demo \
  -e ALLOW_FULL_DEMO_SEED=true \
  -e CONFIRM_FULL_DEMO_SEED=I_UNDERSTAND_FULL_DEMO_SEED \
  -e FORCE_RESEED_DEMO=1 \
  api-demo sh -c 'cd /app && npm run db:seed:full:demo -w api'
```

`seed-full-demo.sh` ayrıca `DATABASE_URL` içinde `pointmor_demo` alt dizgisini doğrular (yanlış DB’ye yazmayı zorlaştırır). Farklı veritabı adı kullanıyorsanız `FULL_DEMO_SEED_DB_URL_SUBSTR` ile özelleştirin veya `SKIP_FULL_DEMO_DB_URL_CHECK=1` ile atlayın (önerilmez).

---

## 6. Demo refresh (local ile birebir hizalama)

```bash
cd /opt/pointmor-demo/Pointmor
git fetch origin --prune
git checkout main
git reset --hard origin/main
git clean -fd
chmod +x infra/scripts/*.sh
./infra/scripts/deploy-demo.sh --cloud
./infra/scripts/seed-full-demo.sh
./infra/scripts/smoke-demo.sh
```

Beklenen sonuç: smoke script `PASS` yazar ve platform konsolunda 4 işletme görünür (`demo-cafe`, `demo-small-cafe`, `demo-busy-cafe`, `demo-coffee-chain`).

---

## 7. Health check

```bash
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
```

Security preflight (ops use):

```bash
curl -sfS \
  -H "X-Pointmor-Preflight-Secret: ${POINTMOR_PREFLIGHT_SECRET}" \
  "http://127.0.0.1:${API_HOST_PORT:-3000}/health?securitySummary=1"
```

- Strict profile should use header-based secret.
- Query param fallback (`preflightSecret=`) is legacy/temporary and disabled by default in strict mode.

Script (aynı işlev: `healthcheck-demo.sh` → `health-check-demo.sh`):

```bash
./infra/scripts/health-check-demo.sh
# veya: ./infra/scripts/healthcheck-demo.sh
```

---

## 8. Cloudflare Tunnel

`CLOUDFLARE_TUNNEL_TOKEN` `infra/docker/.env.demo` içinde tanımlı olmalı (repoda tutulmaz). Ingress hostname → origin eşlemesini Zero Trust panelinde yapın (`api-demo` / `admin-web-demo` servis portları).

### 8.1 Tunnel’ı başlatma veya güncelleme

Stack zaten ayaktaysa (postgres, api, admin) yalnızca tunnel servisini de eklemek / güncellemek için:

```bash
cd /opt/pointmor-demo
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare up -d
```

Komut sırası esnek; aşağıdaki ile aynıdır:

```bash
docker compose --profile cloudflare \
  -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  up -d
```

### 8.2 `./infra/scripts/deploy-demo.sh` ve tunnel

**Varsayılan:** `deploy-demo.sh` yalnızca `postgres-demo`, `api-demo`, `admin-web-demo` kaldırır. **`deploy-demo.sh --cloud`** aynı akışta **`cloudflared`**’i de başlatır (`CLOUDFLARE_TUNNEL_TOKEN` dolu olmalı).

CI/GitHub Actions hâlâ tunnel başlatmaz; gerekirse sunucuda `deploy-demo.sh --cloud` veya aşağıdaki `docker compose … --profile cloudflare up -d` kullanın.

**`--cloud` kullanmadıysanız** ve dışarıdan Cloudflare gerekiyorsa, pull + `deploy-demo.sh` **ardından** yukarıdaki `docker compose … --profile cloudflare up -d` komutunu tekrar çalıştırın (idempotent).

### 8.3 Sunucu yeniden başlatma (reboot)

Compose dosyasındaki servislerde `restart: unless-stopped` vardır; Docker daemon açıldığında konteynerler genelde yeniden kalkar. **Tunnel da** son başarılı `up` ile profile dahil edildiyse aynı proje altında yeniden başlamalıdır.

Kontrol:

```bash
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare ps
```

`cloudflared` yoksa veya `Exit` görüyorsanız, **7.1** komutunu tekrar çalıştırın.

İsteğe bağlı: VM’de Docker’ın açılışta çalışması için `sudo systemctl enable docker` (dağıtıma göre).

### 8.4 İlk kurulumda tek seferde stack + tunnel

```bash
cd /opt/pointmor-demo
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare up -d
```

(İmajlar yoksa önce `./infra/scripts/deploy-demo.sh` ile build edip stack’i kaldırmanız gerekir; ardından tunnel için **7.1** yeterli.)

---

## 9. LAN üzerinden SSH ve hızlı deploy (`pmdeploy` / `pmdeploycld`)

Bazı kurulumlarda demo **PostgreSQL ile aynı host** üzerindedir; SSH açık, uygulama kodu sabit dizindedir.

| Öğe | Örnek |
|-----|--------|
| **SSH** | `ssh -p 22 cc@192.168.1.20` (LAN; VPN veya iç ağ gerekir) |
| **Kullanıcı** | `cc` |
| **Repo kökü** | `/opt/pointmor-demo/Pointmor` |
| **Sunucu** | Docker + Docker Compose; `git`; `infra/scripts/*.sh` çalıştırılabilir olmalı |

**Güvenlik:** Parolalar ve SSH özel anahtarları **bu repoda tutulmaz**. Üretim benzeri ortamlarda mümkünse **anahtar tabanlı** giriş ve güçlü parola politikası kullanın.

### 9.1 `pmdeploy` ile `pmdeploycld` farkı

Sunucuda `~/.bashrc` içinde tanımlı iki shell fonksiyonu aynı akışı kullanır: **`git reset --hard HEAD`** → **`git pull`** → **`chmod +x infra/scripts/*.sh`** → **`deploy-demo.sh`** → **localhost health**.

| Komut | `deploy-demo.sh` çağrısı | Ne zaman |
|--------|---------------------------|----------|
| **`pmdeploy`** | `./infra/scripts/deploy-demo.sh` | Yalnızca Docker stack (Postgres, API, admin). Dış dünya için Cloudflare **başlatılmaz**. |
| **`pmdeploycld`** | `./infra/scripts/deploy-demo.sh --cloud` | Stack + **Cloudflare tunnel** (`cloudflared`). `CLOUDFLARE_TUNNEL_TOKEN` ve env: [bölüm 8](#8-cloudflare-tunnel). |

### 9.2 Örnek `~/.bashrc` gövdeleri

Sunucudaki gerçek dosya ile aynı tutun; aşağısı referans içindir. Health URL’si `API_HOST_PORT` kullanıyorsa shell’de export edin veya `${API_HOST_PORT:-3000}` kullanın.

```bash
pmdeploy() {
  cd /opt/pointmor-demo/Pointmor || return

  echo "📥 Pulling latest code..."
  git reset --hard HEAD || return
  git pull || return

  echo "🔧 Fixing permissions..."
  chmod +x infra/scripts/*.sh

  echo "🐳 Deploying stack..."
  ./infra/scripts/deploy-demo.sh || {
    echo "❌ Deploy failed"
    return
  }

  echo "🔎 API health check..."
  curl -fsS "http://127.0.0.1:${API_HOST_PORT:-3000}/health" || echo "⚠️ API health check failed"
}

pmdeploycld() {
  cd /opt/pointmor-demo/Pointmor || return

  echo "📥 Pulling latest code..."
  git reset --hard HEAD || return
  git pull || return

  echo "🔧 Fixing permissions..."
  chmod +x infra/scripts/*.sh

  echo "☁️ Deploying with Cloudflare..."
  ./infra/scripts/deploy-demo.sh --cloud || {
    echo "❌ Deploy (cloud) failed"
    return
  }

  echo "🔎 API health check..."
  curl -fsS "http://127.0.0.1:${API_HOST_PORT:-3000}/health" || echo "⚠️ API health check failed"
}
```

Deploy sonrası sürümü doğrulamak:

```bash
cd /opt/pointmor-demo/Pointmor && git rev-parse HEAD && git log -1 --oneline
```

Not: `git rev-parse HEAD~` **bir önceki** commit’i verir; aktif sürüm için **`HEAD`** kullanın.

### 9.3 Erişim ve otomasyon sınırı

`192.168.x.x` gibi adresler genelde **yalnızca yerel ağ/VPN** içindir. Cursor veya bulut CI bu makineye **doğrudan SSH ile bağlanamaz**; doğrulama için komutları **sunucuya erişen operatör** çalıştırır. İsterseniz “deploy sonrası `git log -1` çıktısını paylaş” gibi bir kontrol listesi kullanın.

---

## 10. Sık sorunlar

| Belirti | Olası neden | Ne yapın |
|---------|-------------|----------|
| `DATABASE_URL` / migrate hatası | Şifre özel karakter, yanlış host | `DATABASE_URL_DEMO` içinde URL-encode; compose ağında host `postgres-demo`. |
| Health check sürekli fail | API henüz ayakta değil | `docker compose logs -f api-demo`; `HEALTH_CHECK_RETRIES` artırılabilir. |
| `db:seed:full:demo engellendi` | Guard koşulları eksik | `./infra/scripts/seed-full-demo.sh` kullanın; manuel çalıştırırken `APP_ENV=demo`, `ALLOW_FULL_DEMO_SEED=true`, `CONFIRM_FULL_DEMO_SEED=I_UNDERSTAND_FULL_DEMO_SEED` ve uygun `DATABASE_URL` gerekir. |
| `seed-full-demo.sh: Permission denied` | Script execute biti yok | `chmod +x infra/scripts/*.sh` veya `bash infra/scripts/seed-full-demo.sh`. |
| Admin SPA API’ye bağlanmıyor | `PUBLIC_API_BASE_URL` build zamanı | Admin imajını yeniden build (`deploy-demo.sh`); tarayıcıda gerçek HTTPS URL ile uyumlu olsun. |
| CORS reddi | Köken listesi eksik | `CORS_ORIGINS`’e admin ve PWA tam origin ekleyin. |
| `git pull` yetkisiz (Actions) | Sunucuda deploy key yok | Repo için read-only deploy key veya `git` HTTPS token. |
| Tunnel çalışmıyor | Token boş / profil yok | `--profile cloudflare` ve geçerli token. |

---

## 11. GitHub Actions deploy

Secrets: `DEMO_HOST`, `DEMO_USER`, `DEMO_SSH_PRIVATE_KEY`, `DEMO_REPO_PATH`.

- Tetikleme: **`main` üzerinde CI workflow’u başarıyla bittikten sonra** (`workflow_run`) veya **elle** `workflow_dispatch`.
- `main`’e doğrudan push tek başına deploy **tetiklemez** (CI kapısı).
- İsteğe bağlı: Environment variable `DEMO_POST_DEPLOY_SMOKE=1` → SSH sonunda `./infra/scripts/smoke-demo.sh` çalışır (demo DB’de full seed / admin kullanıcı beklenir).

Ayrıntı: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) (GitHub Actions bölümü).
