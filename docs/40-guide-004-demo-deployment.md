# Demo ortamı runbook'u (kurulum -> deployment -> migrate -> seed -> smoke)

> Bu doküman yalnızca demo ortamı içindir ve demo operasyonu için **tek kanonik akış**tır.

Demo akışı: host hazırlığı -> `.env.demo` -> deploy -> migrate -> seed -> smoke/health -> operasyonel kısayollar.

---

## Gerekli dosyalar

- `infra/docker/docker-compose.demo.yml`
- `infra/docker/.env.demo` (`.env.demo.example` kopyası)
- `infra/scripts/deploy-demo.sh`
- `infra/scripts/migrate-demo.sh`
- `infra/scripts/seed-demo.sh`
- `infra/scripts/seed-full-demo.sh` (opsiyonel)
- `infra/scripts/smoke-demo.sh`
- `infra/scripts/health-check-demo.sh`
- `docs/.bashrc.demo` (opsiyonel shell alias/fonksiyonları)

---

## 0) Kapsam ve ilkeler

- Bu akış **demo** içindir; production'da kullanılmaz.
- Demo DB ile local dev/prod DB ayrılmalıdır.
- Seed ve erişim modeli `TenantMembership` doctrine ile hizalı olmalıdır.
- Deploy sonrası migrate/seed adımları operasyonel olarak explicit çalıştırılır.

---

## 1) Demo host önkoşulları

Hedef hostta:

- Docker + Docker Compose plugin
- `git`, `curl`
- Repo klasörü (örnek): `/opt/pointmor-demo/Pointmor`
- Demo env dosyası: `infra/docker/.env.demo`

İlk kurulum örneği:

```bash
sudo mkdir -p /opt/pointmor-demo
cd /opt/pointmor-demo
git clone <POINTMOR_REPO_URL> Pointmor
cd Pointmor
chmod +x infra/scripts/*.sh
```

---

## 2) Ortam hazırlığı (`.env.demo`)

```bash
cp infra/docker/.env.demo.example infra/docker/.env.demo
```

`infra/docker/.env.demo` içinde en az:

- `DATABASE_URL_DEMO`
- `PUBLIC_API_BASE_URL`
- `CORS_ORIGINS`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_OPERATOR_PASSWORD`
- (Cloudflare için) `CLOUDFLARE_TUNNEL_TOKEN`

Demo DB, local dev DB ile paylaşılmamalıdır.

---

## 3) Önerilen kısa akış

1. `.env.demo` hazırla.
2. Demo deploy çalıştır.
3. Demo `migration` adımını çalıştır.
4. `seed` adımını çalıştır.
5. Smoke test çalıştır.
6. Health kontrolü yap.

---

## 4) Deploy

```bash
chmod +x infra/scripts/*.sh
./infra/scripts/deploy-demo.sh
```

Cloudflare tunnel ile:

```bash
./infra/scripts/deploy-demo.sh --cloud
```

Not:

- Deploy scriptinin otomatik seed davranışı script implementasyonuna bağlıdır.
- Operasyonel standart: deploy sonrası seed adımını explicit çalıştır.
- Demo deploy, production deploy değildir.

---

## 5) Migration

```bash
./infra/scripts/migrate-demo.sh
```

Production farkı: demo ortamında migration tekrar koşulabilir; production’da explicit onaylı adım olarak yönetilir.

---

## 6) Seed (demo vs full demo)

İlk kurulum / manuel veri yükleme:

```bash
./infra/scripts/seed-demo.sh
```

Full demo senaryosu (çok tenant + ağır örnek veri):

```bash
./infra/scripts/seed-full-demo.sh
```

Seed farkı:

- `seed-demo.sh`: temel demo verisi.
- `seed-full-demo.sh`: daha geniş demo senaryosu, çok tenant/ek veri.

Uyarılar:

- Demo seed production seed değildir.
- `seed` verisi `TenantMembership` hizasını korumalıdır.
- `User.tenantId` legacy alandır; access için kullanılmaz.

---

## 7) Smoke ve health

```bash
./infra/scripts/smoke-demo.sh
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
./infra/scripts/health-check-demo.sh
```

---

## 7.1) Sik hata: `api-demo is unhealthy`

Belirti:

- `dependency failed to start: container pointmor-demo-api-demo-1 is unhealthy`
- `pmdeploy` komutu hata ile kesilir

Hizli teshis:

```bash
docker compose -f infra/docker/docker-compose.demo.yml --env-file infra/docker/.env.demo ps
docker compose -f infra/docker/docker-compose.demo.yml --env-file infra/docker/.env.demo logs --tail 200 api-demo
```

En yaygin neden (demo strict preflight):

- `.env.demo` icinde guvenlik fallback/preflight degiskenleri eksik veya gecersiz.

Demo icin guvenli minimumlar:

```bash
SECURITY_STATE_ALLOW_MEMORY_FALLBACK=true
SECURITY_STATE_ACK_IN_PROCESS_MEMORY=true
SECURITY_STATE_MEMORY_FALLBACK_JUSTIFICATION=demo-single-node-stack
SECURITY_STATE_MEMORY_FALLBACK_EXPIRES_AT=2026-11-15T00:00:00.000Z
POINTMOR_PREFLIGHT_SECRET=<uzun-rastgele-secret>
```

Not:

- `pmdeploy` artik deploy hatasinda otomatik olarak `compose ps` ve `api-demo` log ozetini basar.

---

## 8) Operasyonel shell kısayolları (`.bashrc.demo`)

`docs/.bashrc.demo` dosyasını demo sunucuda external helper dosyası olarak kullanman önerilir:

```bash
mkdir -p ~/.bashrc.d
cp /opt/pointmor-demo/Pointmor/docs/.bashrc.demo ~/.bashrc.d/pointmor-demo.sh
if ! grep -q "pointmor-demo.sh" ~/.bashrc; then
  cat <<'EOF' >> ~/.bashrc
# Pointmor demo helpers
if [ -f "$HOME/.bashrc.d/pointmor-demo.sh" ]; then
  . "$HOME/.bashrc.d/pointmor-demo.sh"
fi
EOF
fi
source ~/.bashrc
```

Neden bu yöntem:

- `>> ~/.bashrc` ile fonksiyonları her seferinde biriktirmez.
- Güncelleme tek dosya overwrite (`~/.bashrc.d/pointmor-demo.sh`) ile yapılır.
- `.bashrc` temiz kalır, rollback kolaylaşır.

Hızlı güncelleme:

```bash
cp /opt/pointmor-demo/Pointmor/docs/.bashrc.demo ~/.bashrc.d/pointmor-demo.sh
source ~/.bashrc
```

Fonksiyonlar:

- `pmdeploy`: argümanlı demo deploy fonksiyonu (`--cloud`, `--db-mode`, `--full-seed`)
- `pmdeploycld`: `pmdeploy --cloud` wrapper'ı (aynı argümanları destekler)
- `pmstatus`: container + health + tunnel kontrolü

`pmdeploy` kullanım örnekleri:

```bash
# cloud'suz, migrate + seed (default)
pmdeploy

# cloud'lu, migrate + seed
pmdeploy --cloud

# destruktif tam reset + generate + migrate + seed
pmdeploy --db-mode reset-seed

# cloud + yalnızca yapısal DB update (migrate)
pmdeploy --cloud --db-mode update-only

# migrate + full demo seed
pmdeploy --db-mode update-seed --full-seed
```

`--db-mode` değerleri:

- `reset-seed`: DB temizler (`db:reset`), `db:generate` çalıştırır, migrate + seed uygular.
- `update-seed`: migrate + seed uygular.
- `update-only`: yalnızca migrate uygular (seed yok).

Not:

- `pmdeploy` icindeki `db:generate` / `db:reset` adimlari `api-demo` konteyneri icinde calistirilir; hostta `npm` kurulu olmasi gerekmez.
- `reset-seed` akisi konteynerde `npx prisma migrate reset --force` kullanir; ardindan seed adimi `seed-demo.sh` / `seed-full-demo.sh` ile explicit calisir.

Guvenlik notu:

- `pmdeploy` ve `pmdeploycld` içinde `git reset --hard origin/main` + `git clean -fd` vardır.
- Demo hostta local değişiklik tutulmamalıdır; tutuluyorsa bu komutlar değişiklikleri siler.
- `--db-mode reset-seed` destruktiftir; demo DB verisini siler ve yeniden üretir.

---

## 9) CI / workflow notu

- Demo deploy, CI başarı sonrası veya manuel workflow ile tetiklenir.
- Workflow seed çalıştırmaz; seed adımı operasyonel olarak manuel yönetilir.

---

## 10) Hızlı refresh akışı

```bash
git fetch origin --prune
git checkout main
git reset --hard origin/main
git clean -fd
./infra/scripts/deploy-demo.sh --cloud
./infra/scripts/seed-full-demo.sh
./infra/scripts/smoke-demo.sh
```

Destructive uyarı:

- `git reset --hard origin/main` yerel değişiklikleri siler.
- `git clean -fd` untracked dosyaları siler.
- Bu akış demo refresh için yıkıcıdır; çalışma kopyasındaki local değişiklikler korunmaz.

---

## 11) Canonical demo login kontrolü

Demo seed sonrası doğrulama için:

- `admin-demo@pointmor.demo`
- `owner-demo@pointmor.demo`

Not:

- Şifreler dokümana hardcode edilmez; `infra/docker/.env.demo` içindeki `DEMO_*` değişkenlerinden alınır.
- Seed kullanıcılarının güncel referansı için ayrıca `docs/41-ref-001-dev-seed-users.md` izlenmelidir.

---

## 12) Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerde aynı PR/task içinde bu dokümanı güncelle:

- demo deploy/migrate/seed/smoke scriptleri
- `.env.demo` değişken adları
- `docker-compose.demo.yml`
- seed dosyaları
- `auth` / `session` / `TenantMembership` davranışı
