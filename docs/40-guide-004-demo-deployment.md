# Demo dağıtımı (Docker Compose + Cloudflare Tüneli)

> Bu doküman yalnızca demo ortamı içindir.

Demo akışı: `.env.demo` hazırla → deploy et → migrate doğrula → seed (gerekirse) → smoke test.

---

## Gerekli dosyalar

- `infra/docker/docker-compose.demo.yml`
- `infra/docker/.env.demo` (`.env.demo.example` kopyası)
- `infra/scripts/deploy-demo.sh`
- `infra/scripts/migrate-demo.sh`
- `infra/scripts/seed-demo.sh`
- `infra/scripts/seed-full-demo.sh` (opsiyonel)
- `infra/scripts/smoke-demo.sh`

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

---

## 2) Dağıtım

```bash
chmod +x infra/scripts/*.sh
./infra/scripts/deploy-demo.sh
```

Cloudflare tunnel ile:

```bash
./infra/scripts/deploy-demo.sh --cloud
```

Dağıtım script'i build + up + migrate + health akışını çalıştırır.

---

## 3) Migration (gerekirse tekrar)

```bash
./infra/scripts/migrate-demo.sh
```

---

## 4) Seed

İlk kurulum / manuel veri yükleme:

```bash
./infra/scripts/seed-demo.sh
```

Full demo senaryosu (çok tenant + ağır örnek veri):

```bash
./infra/scripts/seed-full-demo.sh
```

Seed komutları otomatik deploy’un parçası değildir.

---

## 5) Smoke ve health

```bash
./infra/scripts/smoke-demo.sh
curl -sfS "http://127.0.0.1:${API_HOST_PORT:-3000}/health"
```

---

## 6) CI / workflow notu

- Demo deploy, CI başarı sonrası veya manuel workflow ile tetiklenir.
- Workflow seed çalıştırmaz; seed adımı operasyonel olarak manuel yönetilir.

---

## 7) Hızlı refresh akışı

```bash
git fetch origin --prune
git checkout main
git reset --hard origin/main
git clean -fd
./infra/scripts/deploy-demo.sh --cloud
./infra/scripts/seed-full-demo.sh
./infra/scripts/smoke-demo.sh
```
