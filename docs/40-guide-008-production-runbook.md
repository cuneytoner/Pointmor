# Production runbook (deploy / rollback / incident)

Bu doküman production operasyonunda “insan tarafından uygulanabilir” adım setini verir.

Kapsam:

- deploy
- rollback
- incident/emergency
- cutover sonrası doğrulama

---

## 1) Deploy runbook

### 1.1 Pre-deploy

- [ ] Change request/onay hazır
- [ ] `release_sha` belirlendi
- [ ] release image digest’leri doğrulandı
- [ ] `infra/docker/.env.prod` güncel
- [ ] `ENV_FILE=infra/docker/.env.prod ./infra/scripts/preflight-prod-env.sh` PASS
- [ ] DB backup snapshot tamamlandı

### 1.2 Deploy execution

GitHub Actions:

1. `Deploy production` workflow aç
2. `release_sha` gir
3. Gerekirse `api_image` / `admin_image` override et
4. Onay sonrası deploy tamamlanmasını bekle

Host üstünde manuel (acil durum):

```bash
cd /opt/pointmor-prod/Pointmor
git fetch origin <release_sha>
git checkout --detach <release_sha>
chmod +x infra/scripts/*.sh
ENV_FILE=infra/docker/.env.prod ./infra/scripts/deploy-prod.sh
```

### 1.3 Post-deploy smoke

- [ ] `curl -fsS http://127.0.0.1:${API_HOST_PORT:-3000}/health`
- [ ] preflight:

```bash
curl -fsS \
  -H "X-Pointmor-Preflight-Secret: ${POINTMOR_PREFLIGHT_SECRET}" \
  "http://127.0.0.1:${API_HOST_PORT:-3000}/health?securitySummary=1"
```

- [ ] admin login + `/auth/me`
- [ ] `/admin/bootstrap`
- [ ] internal job HMAC dry-run
- [ ] webhook test event (varsa provider sandbox)

---

## 2) Rollback runbook

### 2.1 Ne zaman rollback?

- kritik kullanıcı akışı bozuk
- migration sonrası forward-fix kısa sürede mümkün değil
- güvenlik policy enforcement beklenmeyen kesintiye neden oluyor

### 2.2 Rollback stratejisi

Öncelik sırası:

1. **Image rollback** (önceki doğrulanmış digest)
2. **Code rollback** (önceki `release_sha`)
3. **DB restore** (yalnız onaylı bakım penceresi + RTO/RPO planıyla)

### 2.3 Adımlar (image rollback)

1. Son iyi release manifestten image refleri al.
2. `Deploy production` workflow’u tekrar çalıştır:
   - `release_sha`: önceki stable SHA
   - `api_image`: önceki stable ref
   - `admin_image`: önceki stable ref
   - `skip_migrate=true` (yalnız migration geri uyumluluğu doğrulanmışsa)
3. Post-rollback smoke çalıştır.

> Migration uyumsuzluğu şüphesi varsa `skip_migrate` kullanımını incident commander onayı olmadan yapmayın.

---

## 3) Incident / emergency checklist

### 3.1 İlk 15 dakika

- [ ] Incident seviyesi belirle (SEV)
- [ ] Release freeze uygula
- [ ] Son deploy SHA + manifest + logs topla
- [ ] `/health` ve preflight ile security durumunu doğrula
- [ ] Gerekirse rollback kararı al

### 3.2 Güvenlik odaklı acil kontroller

- [ ] `SECURITY_STATE_BACKEND=redis` mi?
- [ ] `INTERNAL_JOB_REQUIRE_HMAC=true` mi?
- [ ] `WEBHOOK_AUTH_MODE=hmac` mi?
- [ ] `POINTMOR_PREFLIGHT_ALLOW_QUERY=false` mi?
- [ ] memory fallback expiry geçmiş mi?

### 3.3 İletişim

- [ ] İç ekip status update (15-30 dk döngü)
- [ ] Etkilenen tenant/customer iletişim taslağı
- [ ] RCA follow-up ticket aç

---

## 4) Cutover sonrası doğrulama

Rollout cutoff’ları içeren deploy sonrası:

- [ ] `customer_token_missing_jti` metriği gözlendi
- [ ] `customer_auth_bearer_legacy` metriği beklenen seviyede
- [ ] `internal_job_legacy_auth` metriği sıfıra yakın/0
- [ ] `customer_bearer_sunset_blocked` anomali yok (beklenmeyen)
- [ ] login/re-login path sağlıklı

---

## 5) Secret rotation mini-runbook

1. Yeni secret üret (secret manager).
2. Production env’e yaz (henüz aktif etme gerekiyorsa staged yaklaşım).
3. Kontrollü deploy yap.
4. Smoke + preflight + webhook/internal job testlerini çalıştır.
5. Eski secret’i revoke et.
6. Manifest + change log güncelle.

---

## 6) Kalan manuel operasyon notları

- DB restore prosedürü bu repoda otomatikleştirilmedi (platform/DB sağlayıcısı prosedürü kullanılır).
- WAF/CDN/LB policy değişiklikleri infra platformunda izlenmelidir.
- Cron scheduler’ın HMAC header üretimi için `infra/scripts/sign-internal-job-request.sh` referans alınır.
