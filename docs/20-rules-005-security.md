# Güvenlik kuralları

**Amaç:** Pointmor platformunda tekrarlayan güvenlik hatalarını azaltmak; özellikle tenant izolasyonu, erişim kontrolü ve veri sızıntısı riskleri.

> **[DEPRECATED – legacy document SaaS template, not part of current platform architecture]** Bu dokümandaki bazı import/render/paylaşım örnekleri document-SaaS şablonundan kalmadır. Tenant/membership/module erişim modeli için öncelik: [`20-rules-015-cross-tenant-access-security.md`](./20-rules-015-cross-tenant-access-security.md) ve [`10-meta-004-core-platform-definition.md`](./10-meta-004-core-platform-definition.md).

---

## Özet kararlar

| Risk | Temel önlem |
|------|----------------|
| XSS | Çıktı bağlamına göre escape/sanitize; `dangerouslySetInnerHTML` yalnız güvenilir pipeline çıktısı. |
| SSRF | Sunucu taraflı URL fetch whitelist veya blok listesi; iç IP yok. |
| Token sızıntısı | Unlisted linkler log ve referrer’da dikkat; query token URL maskeleme. |

---

## Genel prensipler

1. **En az yetki:** Servis hesapları ve API key’ler minimum scope.
2. **Savunma derinliği:** Validation + output encoding + rate limit birlikte.
3. **Güven varsayma:** Webhook ve dış callback imza doğrulamalı.

---

## Auth ve oturum

- Oturum cookie ise `HttpOnly`, `Secure`, `SameSite` uygun.
- JWT ise kısa ömür + refresh rotation politikası; revoke listesi ihtiyaç halinde.
- **Password:** Argon2/bcrypt; zayıf şifre politikası ürün kararı.

---

## Access değerlendirme sırası

1. Authentication
2. Tenant context çözümleme
3. Request'i tenant scope'una bağlama
4. Membership doğrulama
5. Role izinlerini doğrulama
6. Module activation doğrulama

Açıkça izin verilmediği sürece access varsayılan olarak reddedilir:

- membership
- role
- module activation

Tüm query'ler tenant scope'lu olmalıdır.

Access control çok katmanda enforce edilir:

- API layer
- service layer
- database layer

### OAuth / OIDC (social login)

- **Authorization Code** + **PKCE** (public client); `state` parametresi **CSRF** için zorunlu; callback URL’ler ortam başına (`staging` / `prod`) ayrı kayıtlı.
- **Token’lar** (access/refresh) loglanmaz; gerekiyorsa DB’de şifreli veya kısa ömürlü saklama.
- **Account linking:** Aynı e-posta ile şifreli hesap + OAuth — ürün politikası net olmalı (doğrulanmış e-posta birleştirme veya kullanıcıya açık adım); ayrıntı ileride ayrı plan dokümanında toplanır.
- Her yeni provider: ayrı smoke test (ilk giriş, tekrar giriş, hata mesajları).

---

## Rate limiting

- Login, import, PDF export ve paylaşım doğrulama endpoint'lerinde IP + kullanıcı bazlı limit.
- 429 ile tutarlı gövde (`retry-after` isteğe bağlı).
- **API genel çerçeve** (hangi endpoint’lerde zorunlu olduğu tasarımı): [20-rules-004-api-design.md](./20-rules-004-api-design.md) — orada kısaca; uygulama detayı burada.

---

## Input ve output

- **Validation:** Zod veya eşdeğeri; tüm dış girdi (query, body, header).
- **Output encoding:** HTML’de metin escape; JSON’da `Content-Type` doğru.
- **XSS:** Kullanıcı içeriği HTML’e giderken sanitize veya sıkı allowlist (ör. sadece belirli etiketler).

---

## SSRF ve URL import

- Üçüncü parti URL fetch **allowlist** (kendi domain’ler + onaylı) veya **block** (169.254, 10., metadata IP’leri).
- Timeout ve max boyut zorunlu.

---

## Dosya yükleme

- MIME ve uzantı çift kontrolü; içerik başına magic byte.
- Boyut limiti; depolama public URL ile doğrudan erişimde path traversal yok.
- Dosya adı güvenli slug; kullanıcı adı ham kullanılmaz.

---

## Webhook (ör. Paddle)

- İmza/HMAC doğrulama zorunlu.
- Idempotency key veya olay id ile tekrar işleme güvenli.
- Ham payload log’da PII azaltılmış.

---

## Token ve paylaşım linkleri

- Unlisted token: yeterli entropi (`crypto` tabanlı); tahmin edilemez.
- **Query param:** Referrer ve analytics sızıntısına dikkat; mümkünse path tabanlı veya kısa ömürlü token.
- Şifre korumalı doküman: hash `bcrypt/argon2`; doğrulama sunucuda.

---

## Audit ve PII

- Admin ve güvenlik olayları audit log’da.
- Log’da e-posta tam metin yerine hash veya son 3 karakter (politikaya göre).
- GDPR/veri silme talepleri için süreç notu (ürün hukuku ile).

---

## Prod secret ve erişim

- Secret rotation prosedürü.
- Prod DB’ye doğrudan erişim sadece break-glass; MFA.

---

## Incident (kısa)

- Tespit → izole et (key rotate) → kök neden → müşteri bildirimi (gerekirse) → postmortem.

---

## Alan bazlı kurallar

| Alan | Kural |
|------|--------|
| **Harici kaynak import (gelecek)** | Anahtarlar env’de; erişim entegrasyonla sınırlı; kullanıcı URL’si tek başına yetmez. |
| **Logo/image URL** | SSRF kontrolü; HTTPS tercih; redirect limiti. |
| **E-posta** | SPF/DKIM; gönderim queue’da retry; içerik injection’a karşı template escape. |
| **Public API keys** | Rate limit + scope; asla admin yetkisi vermez. |

---

## Anti-pattern’ler

- Kullanıcı HTML’ine “güvenmek”.
- Secret’ı log veya hata mesajında dökmek.
- Token’ı her analitik çağrısına eklemek.
- “Sadece internal” diye auth bypass.

---

## Kısa checklist

- [ ] Yeni endpoint auth ve rate limit altında mı?
- [ ] Dış URL veya HTML işleniyor mu? → SSRF/XSS kontrol listesi
- [ ] Log’da hassas veri yok mu?

---

## İlgili dokümanlar

- **Validation ve hata gövdesi şekli**: [20-rules-004-api-design.md](./20-rules-004-api-design.md).
- **Mimari katman sınırları**: [20-rules-002-architecture.md](./20-rules-002-architecture.md).
- **Merkez indeks**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
