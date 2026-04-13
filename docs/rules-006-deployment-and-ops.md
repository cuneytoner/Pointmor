# Dağıtım ve operasyon kuralları

**Amaç:** Local’den production’a öngörülebilir, geri alınabilir ve gözlemlenebilir yayın.

---

## Özet kararlar

| Ortam | Amaç |
|--------|------|
| **local** | Geliştirme; `.env.example` ile hizalı. |
| **preview** | PR branch; otomatik deploy, kısa ömür. |
| **staging** | Prod’a yakın konfig; migration dry-run. |
| **production** | Gerçek kullanıcı; değişiklik kontrollü. |

**Kural:** Secret asla repoda; environment variable ile enjeksiyon.

---

## Environment ve secret

- `.env.example` tüm anahtarları listeler (değer yok).
- Prod değerleri secret manager veya platform secret’larında.
- **Rotation:** API key ve DB şifresi periyodu dokümante.

---

## CI/CD akışı (hedef)

1. PR açılır → **lint + typecheck + unit** (hızlı).
2. Merge → **build + integration** (isteğe bağlı aşamalı).
3. Staging deploy → **migration** (dry-run veya staging’de uygula).
4. Manuel veya onaylı **production deploy**.
5. **Post-deploy:** health check, kritik smoke.

---

## Pipeline adımları

| Adım | İçerik |
|------|--------|
| Lint | ESLint / Biome |
| Typecheck | `tsc` |
| Build | Next / Vite / API bundle |
| Test | Unit + seçili integration |
| Migration | `prisma migrate deploy` veya eşdeğeri — **asla** review edilmeden prod’a yok |
| Deploy | Immutable artifact veya image |
| Health | `/health` veya `/api/health` 200 + bağımlılık kontrolü |

---

## Migration

- **Yerel:** `migrate dev` ile geliştir; migration dosyası PR’da.
- **Prod:** Backup penceresi veya düşük trafik; uzun kilit süreni transaction’lar ayrı planlanır.
- **Rollback:** Mümkünse forward-fix; geri migration nadiren ve bilinçli.
- **Şema kuralları, revision, soft delete:** [rules-003-data-model.md](./rules-003-data-model.md) — bu dosya *ne zaman* deploy edileceğini ve pipeline’ı tanımlar; veri anlamı `rules-003-data-model` ile uyumlu olmalıdır.

---

## Health ve gözlemlenebilirlik

- **Health endpoint:** Process + DB + (isteğe bağlı) queue ping.
- **Log:** Merkezi toplama (örn. structured JSON).
- **Error tracking:** Sentry vb. — PII scrubbing açık.
- **Alerting:** 5xx oranı, health fail, queue derinliği eşikleri.

---

## Backup ve restore

- **DB:** Otomatik snapshot + saklama süresi; restore prosedürü yazılı (çeyrek yılda dry-run önerilir).
- **Object storage:** Versiyonlama veya lifecycle policy (logo/PDF).

---

## Seed data

- **Dev/staging:** Seed script veya fixture kabul edilir.
- **Production:** Seed yok (istisna: ilk kurulum tek seferlik ve onaylı).

---

## MVP deployment notları

- Tek region yeterli; multi-region sonra.
- **Worker ayrımı:** Queue derinliği ve timeout sürekli patlıyorsa ayrı process.
- **Queue:** Toplu e-posta, büyük PDF, webhook retry.
- **PDF:** CPU/memory limit; timeout; ayrı worker önerilir yoğunlukta.
- **Hosted documents:** CDN cache + invalidation (publish sonrası); `Cache-Control` politikası net.

---

## Anti-pattern’ler

- Production veritabanında elle şema değişikliği.
- Migration’ı CI’da çalıştırmadan prod deploy.
- Secret’ı Slack/email ile paylaşma veya repoya gömme.
- Tek VM’de gereksiz 5 microservice (operasyon yükü > kazanç).

---

## Kısa checklist

- [ ] `.env` prod için dokümante edildi mi (isimler, değil değerler)?
- [ ] Migration PR’da gözden geçirildi mi?
- [ ] Deploy sonrası health ve smoke kim çalıştıracak?
- [ ] Rollback veya hotfix yolu net mi?

---

## İlgili dokümanlar

- **Worker/queue ne zaman** (iş mantığı): [rules-002-architecture.md](./rules-002-architecture.md).
- **PDF güvenliği ve resource limit**: [rules-005-security.md](./rules-005-security.md).
- **Merkez indeks**: [meta-001-rules-index.md](./meta-001-rules-index.md).
