# Demo deployment (Docker Compose + Cloudflare Tunnel)

**Kısa operasyon runbook (checklist):** [`40-guide-005-demo-deployment-runbook.md`](./40-guide-005-demo-deployment-runbook.md)

Pre-alpha demo ortamı: Debian VM üzerinde Docker Compose, PostgreSQL ayrı volume, dış erişim için Cloudflare Tunnel. **Dev veritabanı ile aynı instance kullanılmamalıdır.**

## Dosyalar

| Dosya | Açıklama |
|--------|----------|
| `infra/docker/docker-compose.demo.yml` | `postgres-demo`, `api-demo`, `admin-web-demo`, isteğe bağlı `cloudflared` (profil) |
| `infra/docker/.env.demo.example` | `infra/docker/.env.demo` olarak kopyalanır; sırlar burada (git’e eklenmez) |
| `apps/api/Dockerfile` | API üretim imajı; healthcheck `/health` |
| `apps/admin-web/Dockerfile` | Vite build + nginx SPA; `VITE_API_BASE_URL` build arg |
| `infra/scripts/deploy-demo.sh` | Build + up + `migrate deploy` + **health check** (seed yok) |
| `infra/scripts/migrate-demo.sh` | `migrate deploy` + health check |
| `infra/scripts/health-check-demo.sh` | `127.0.0.1:${API_HOST_PORT}/health` yeniden denemeli |
| `infra/scripts/healthcheck-demo.sh` | Aynı script (prompt/doküman uyumu için kısa isim) |
| `infra/scripts/seed-demo.sh` | Yalnızca manuel/ilk kurulum; deploy ile çağrılmaz |
| `.github/workflows/deploy-demo.yml` | `main` push / `workflow_dispatch` → SSH ile `deploy-demo.sh` |
| `apps/api/prisma/seed-demo.ts` | Demo kullanıcıları; şifreler yalnızca ortam değişkeni |

## Hızlı başlangıç (VM)

1. `cp infra/docker/.env.demo.example infra/docker/.env.demo` — tüm `CHANGE_ME_*` değerlerini değiştirin.
2. `PUBLIC_API_BASE_URL` ve `CORS_ORIGINS` değerlerini gerçek demo alan adlarına göre ayarlayın (Cloudflare’de tanımladığınız hostname’ler).
3. İmajları üretip stack’i kaldırın:

   ```bash
   chmod +x infra/scripts/deploy-demo.sh infra/scripts/migrate-demo.sh infra/scripts/health-check-demo.sh infra/scripts/seed-demo.sh
   ./infra/scripts/deploy-demo.sh
   ```

4. Script sonunda migrate ardından health check çalışır. Ayrıca: `curl -sS http://127.0.0.1:${API_HOST_PORT:-3000}/health`

## Cloudflare Tunnel

- `docker compose -f infra/docker/docker-compose.demo.yml --env-file infra/docker/.env.demo --profile cloudflare up -d` ile `cloudflared` başlar; `CLOUDFLARE_TUNNEL_TOKEN` `infra/docker/.env.demo` içinde olmalıdır.
- **Varsayılan:** `./infra/scripts/deploy-demo.sh` tunnel başlatmaz. **`./infra/scripts/deploy-demo.sh --cloud`** ile `cloudflared` de kalkar (`CLOUDFLARE_TUNNEL_TOKEN` gerekir). Aksi halde yeni deployment sonrası tunnel için compose’u [`40-guide-005-demo-deployment-runbook.md`](./40-guide-005-demo-deployment-runbook.md) bölüm 7’deki gibi çalıştırın.
- Ingress kurallarını Zero Trust panelinde **Docker servis adreslerine** değil, tunnel çıkışına göre ayarlayın: ör. `https://api-demo…` → `http://api-demo:3000` ağı içindeki hostname’ler (Cloudflare dokümantasyonuna göre genelde public hostname → origin URL; VM’de tunnel konteyneri `demo` ağına bağlıdır).

## Migration

- Varsayılan: `RUN_MIGRATIONS_ON_START=true` → API konteyneri açılışta `prisma migrate deploy` çalıştırır.
- Ayrıca `./infra/scripts/migrate-demo.sh` ile çalışan API’ye karşı idempotent tekrar çalıştırılabilir.

## Demo seed (VM)

`./infra/scripts/seed-demo.sh` **`api-demo` konteyneri içinde** `npm run db:seed:demo` çalıştırır; sunucuda ayrıca Node/npm kurmanız gerekmez. Önce stack ayakta olmalı (`postgres-demo`, `api-demo`).

1. `infra/docker/.env.demo` içinde **`DATABASE_URL_DEMO`** (compose ağı: `postgres-demo`) ve **`DEMO_ADMIN_PASSWORD`**, **`DEMO_OPERATOR_PASSWORD`** (≥12 karakter).
2. `./infra/scripts/seed-demo.sh`

Bu işlem yalnızca **`seed-demo.ts`** (`db:seed:demo`) çalıştırır: ortam şifreli admin/işletme kullanıcıları ve `demo-cafe`. **Yerel `db:seed` ile gelen üç senaryolu kiracı** (`demo-small-cafe`, `demo-busy-cafe`, `demo-coffee-chain`) ve menü / müşteri / kampanya yığını **bu script’te yoktur**; ihtiyaç halinde ayrı süreç veya geliştirme veritabanı: [`41-ref-001-dev-seed-users.md`](./41-ref-001-dev-seed-users.md) (“İki seed akışı”).

İsteğe bağlı e-postalar: `DEMO_ADMIN_EMAIL`, `DEMO_OPERATOR_EMAIL`.

Yerel geliştirici makinede doğrudan Postgres’e bağlanıp seed çalıştırmak isterseniz: `DATABASE_URL=... npm run db:seed:demo -w api` (`apps/api`); `DATABASE_URL_SEED` artık `seed-demo.sh` için zorunlu değildir.

**Üretim ortamında bu hesapları ve şifreleri kullanmayın.**

## Güvenlik notları

- Postgres portu compose’ta yalnızca `127.0.0.1`’e map edilir; internete doğrudan açmayın.
- Seed ve demo şifreleri dokümantasyonda sabitlenmez; `docs/41-ref-001-dev-seed-users.md` yalnızca **yerel dev** içindir.

## GitHub Actions — demo deploy

- Tetik: `main` branch’e **push** veya **workflow_dispatch** (Actions → Deploy demo → Run workflow).
- Sunucuda repo klonlu olmalı (`git pull` kullanılır); özel repoda deploy key veya `git` erişimi tanımlı olmalı.
- **Seed workflow’da yoktur**; yalnızca SSH üzerinden `./infra/scripts/deploy-demo.sh` çalışır.

### Gerekli GitHub Secrets

| Secret | Açıklama |
|--------|----------|
| `DEMO_HOST` | VM hostname veya IP |
| `DEMO_USER` | SSH kullanıcı adı |
| `DEMO_SSH_PRIVATE_KEY` | Sunucuya giriş için PEM (tam metin, `-----BEGIN` … `END-----`) |
| `DEMO_REPO_PATH` | Sunucuda repo kökü (örn. `/opt/pointmor-demo`) |

Repository **Settings → Environments → `demo`** ile onay adımı veya koruma eklenebilir (isteğe bağlı).

### GHCR (GitHub Container Registry) — isteğe bağlı

Bazı ekip süreçlerinde imajlar **GHCR**’de tutulur; sunucuda yalnızca `pull` çalıştırılır. **Mevcut varsayılan:** VM’de `docker compose build` (kaynak repodan). GHCR’e geçmek için ayrı bir “build & push” iş akışı ve `docker-compose` içinde `image: ghcr.io/<org>/pointmor-api:<tag>` tanımı gerekir; `GITHUB_TOKEN` veya `GHCR` yazma izni olan PAT kullanılır — sırlar yine GitHub Secrets’ta.

### Rollback (öneri)

- **Kod tabanı:** Sunucuda `git log`, sorunsuz commit’e `git checkout <sha>` veya `git revert`, ardından `./infra/scripts/deploy-demo.sh`.
- **İmaj:** Deploy öncesi `docker image ls` ile mevcut imajları not edin; gerekirse önceki tag’e `docker compose` ile dönmek için compose dosyasında `image:` sabitlemesi gerekir (şu an `build:` kullanılıyor — pratik rollback genelde **önceki commit + yeniden build**).

## CI (kalite)

- `.github/workflows/ci.yml` — `npm ci` → Prisma (`ci:prisma`) → `lint` → `ci:i18n` → `build`.
- Deploy şu an **CI’yi beklemez**; isterseniz `deploy-demo.yml` tetikleyicisini `workflow_run` + `workflows: ["CI"]` + başarı koşulu ile değiştirin.
