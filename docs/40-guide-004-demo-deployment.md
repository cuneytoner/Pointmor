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

## 8) Operasyonel shell kısayolları (`.bashrc.demo`)

`docs/.bashrc.demo` dosyasını demo sunucudaki kullanıcı `.bashrc` dosyasına ekleyebilirsin:

```bash
cat /opt/pointmor-demo/Pointmor/docs/.bashrc.demo >> ~/.bashrc
source ~/.bashrc
```

Fonksiyonlar:

- `pmdeploy`: demo deploy (local)
- `pmdeploycld`: demo deploy + cloudflared
- `pmstatus`: container + health + tunnel kontrolü

Guvenlik notu:

- `pmdeploy` ve `pmdeploycld` içinde `git reset --hard HEAD` vardır.
- Demo hostta local değişiklik tutulmamalıdır; tutuluyorsa bu komutlar değişiklikleri siler.

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
