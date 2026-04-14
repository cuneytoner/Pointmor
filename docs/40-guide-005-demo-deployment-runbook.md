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
| `DATABASE_URL_SEED` | (Opsiyonel) Host’tan seed; localhost + `POSTGRES_DEMO_PORT`. |
| `DEMO_ADMIN_PASSWORD`, `DEMO_OPERATOR_PASSWORD` | Yalnız seed için; ≥12 karakter. |

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

Otomatik deploy ile **çalıştırılmaz**. Host’ta Node + `npm ci` gerekir.

`infra/docker/.env.demo` içinde:

- `DATABASE_URL_SEED=postgresql://USER:PASS@127.0.0.1:55432/DB` (port `POSTGRES_DEMO_PORT` ile uyumlu)
- `DEMO_ADMIN_PASSWORD`, `DEMO_OPERATOR_PASSWORD`

```bash
cd /opt/pointmor-demo
npm ci
./infra/scripts/seed-demo.sh
```

---

## 6. Health check

```bash
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
```

Script (aynı işlev: `healthcheck-demo.sh` → `health-check-demo.sh`):

```bash
./infra/scripts/health-check-demo.sh
# veya: ./infra/scripts/healthcheck-demo.sh
```

---

## 7. Cloudflare Tunnel

`CLOUDFLARE_TUNNEL_TOKEN` `infra/docker/.env.demo` içinde tanımlı olmalı (repoda tutulmaz). Ingress hostname → origin eşlemesini Zero Trust panelinde yapın (`api-demo` / `admin-web-demo` servis portları).

### 7.1 Tunnel’ı başlatma veya güncelleme

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

### 7.2 `./infra/scripts/deploy-demo.sh` ve tunnel

**Varsayılan:** `deploy-demo.sh` yalnızca `postgres-demo`, `api-demo`, `admin-web-demo` kaldırır. **`deploy-demo.sh --cloud`** aynı akışta **`cloudflared`**’i de başlatır (`CLOUDFLARE_TUNNEL_TOKEN` dolu olmalı).

CI/GitHub Actions hâlâ tunnel başlatmaz; gerekirse sunucuda `deploy-demo.sh --cloud` veya aşağıdaki `docker compose … --profile cloudflare up -d` kullanın.

**`--cloud` kullanmadıysanız** ve dışarıdan Cloudflare gerekiyorsa, pull + `deploy-demo.sh` **ardından** yukarıdaki `docker compose … --profile cloudflare up -d` komutunu tekrar çalıştırın (idempotent).

### 7.3 Sunucu yeniden başlatma (reboot)

Compose dosyasındaki servislerde `restart: unless-stopped` vardır; Docker daemon açıldığında konteynerler genelde yeniden kalkar. **Tunnel da** son başarılı `up` ile profile dahil edildiyse aynı proje altında yeniden başlamalıdır.

Kontrol:

```bash
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare ps
```

`cloudflared` yoksa veya `Exit` görüyorsanız, **7.1** komutunu tekrar çalıştırın.

İsteğe bağlı: VM’de Docker’ın açılışta çalışması için `sudo systemctl enable docker` (dağıtıma göre).

### 7.4 İlk kurulumda tek seferde stack + tunnel

```bash
cd /opt/pointmor-demo
docker compose -f infra/docker/docker-compose.demo.yml \
  --env-file infra/docker/.env.demo \
  --profile cloudflare up -d
```

(İmajlar yoksa önce `./infra/scripts/deploy-demo.sh` ile build edip stack’i kaldırmanız gerekir; ardından tunnel için **7.1** yeterli.)

---

## 8. Sık sorunlar

| Belirti | Olası neden | Ne yapın |
|---------|-------------|----------|
| `DATABASE_URL` / migrate hatası | Şifre özel karakter, yanlış host | `DATABASE_URL_DEMO` içinde URL-encode; compose ağında host `postgres-demo`. |
| Health check sürekli fail | API henüz ayakta değil | `docker compose logs -f api-demo`; `HEALTH_CHECK_RETRIES` artırılabilir. |
| Admin SPA API’ye bağlanmıyor | `PUBLIC_API_BASE_URL` build zamanı | Admin imajını yeniden build (`deploy-demo.sh`); tarayıcıda gerçek HTTPS URL ile uyumlu olsun. |
| CORS reddi | Köken listesi eksik | `CORS_ORIGINS`’e admin ve PWA tam origin ekleyin. |
| `git pull` yetkisiz (Actions) | Sunucuda deploy key yok | Repo için read-only deploy key veya `git` HTTPS token. |
| Tunnel çalışmıyor | Token boş / profil yok | `--profile cloudflare` ve geçerli token. |

---

## GitHub Actions deploy

Secrets: `DEMO_HOST`, `DEMO_USER`, `DEMO_SSH_PRIVATE_KEY`, `DEMO_REPO_PATH`. Ayrıntı: [`40-guide-004-demo-deployment.md`](./40-guide-004-demo-deployment.md) (GitHub Actions bölümü).
