# Demo dağıtımı (Docker Compose + Cloudflare Tüneli)

> Bu doküman yalnızca demo ortamı içindir.

Demo akışı: `.env.demo` hazırla → deploy et → migrate çalıştır → seed çalıştır → smoke/health doğrula.

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

---

## 1) Ortam hazırlığı

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

## 2) Önerilen kısa akış

1. `.env.demo` hazırla.
2. Demo deploy çalıştır.
3. Demo `migration` adımını çalıştır.
4. `seed` adımını çalıştır.
5. Smoke test çalıştır.
6. Health kontrolü yap.

---

## 3) Deploy

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

## 4) Migration

```bash
./infra/scripts/migrate-demo.sh
```

Production farkı: demo ortamında migration tekrar koşulabilir; production’da explicit onaylı adım olarak yönetilir.

---

## 5) Seed (demo vs full demo)

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

## 6) Smoke ve health

```bash
./infra/scripts/smoke-demo.sh
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
./infra/scripts/health-check-demo.sh
```

---

## 7) CI / workflow notu

- Demo deploy, CI başarı sonrası veya manuel workflow ile tetiklenir.
- Workflow seed çalıştırmaz; seed adımı operasyonel olarak manuel yönetilir.

---

## 8) Hızlı refresh akışı

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

## 9) Dokümanı Güncel Tutma Kuralı

Aşağıdaki değişikliklerde aynı PR/task içinde bu dokümanı güncelle:

- demo deploy/migrate/seed/smoke scriptleri
- `.env.demo` değişken adları
- `docker-compose.demo.yml`
- seed dosyaları
- `auth` / `session` / `TenantMembership` davranışı
