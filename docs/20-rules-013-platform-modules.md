# Platform modüler mimari kuralları

**Amaç:** Pointmor’un çok kiracılı çekirdeğini koruyarak, ürün alanlarını modül bazlı genişletmek; mevcut **cafe/loyalty** işlevlerini platform içinde bir modül olarak sürdürmek.

---

## Tanım: Core Platform vs Module

| Katman | Sorumluluk |
|--------|-------------|
| **Core Platform** | Kimlik, tenant, membership, auth, oturum, plan/abonelik, tenant izolasyonu, modül aktivasyon altyapısı |
| **Module** | Belirli iş alanı (örn. cafe, AI aksiyon, e-fatura), tenant kapsamında API/UI ve alan verisi |

**Kural:** Core platform, modüllerin çalıştığı güvenli temel katmandır; modül alanları core’u bypass etmez.

**Erişim doktrini:** **All access control is based on: membership + role + module activation**

---

## Temel kurallar

1. **Core sahipliği sabittir:** `users`, `tenants`, `memberships`, `auth/session` yalnızca core sorumluluğundadır.
2. **Module core entity değiştiremez:** Modüller core tablolarda iş kuralı mutasyonu yapmaz; core verisini yalnızca izinli okuma/bağlantı amacıyla kullanır.
3. **Tenant scope zorunludur:** Modül verisi tenant kapsamlıdır; cross-tenant erişim yalnızca core membership/policy kontrolü ile mümkündür.
4. **Erişim membership tabanlıdır:** Her modül API/UI erişimi aktif tenant + membership bağlamında değerlendirilir.
5. **Mevcut cafe alanı korunur:** Var olan loyalty/cafe işlevleri kaldırılmaz; platform içinde `cafe` modülü olarak konumlanır.

---

## Modül sistemi tasarımı

### Module

Platform genelinde modül kataloğunu tanımlar.

- `id`
- `name` (örn. `cafe`, `ai_act`, `e_invoice`)
- `description`

### TenantModule

Tenant bazında modül durumunu tanımlar.

- `tenant_id`
- `module_id`
- `is_active`

**Kural:** Bir modülün tenant içinde çalışabilmesi için `TenantModule.is_active = true` olmalıdır.

---

## Örnek modüller

| Modül | Durum | Açıklama |
|------|------|----------|
| **`cafe`** | Mevcut | Loyalty/cafe operasyonları (müşteri, ziyaret, ödül, redemption, cashier vb.) |
| **`ai_act`** | Yeni (ilk non-loyalty) | B2B compliance odaklı AI Act uyum süreçleri |

---

## Aktivasyon kuralları

1. **Tenant bazlı aç/kapa:** Modül etkinliği tenant seviyesinde yönetilir.
2. **Pasif modül görünmez:** `is_active = false` olan modül UI menü, ekran ve aksiyon üretmez.
3. **Pasif modül API vermez:** Pasif modüle ait route/iş akışı tenant için veri üretmez ve işlem kabul etmez.
4. **Guard sırası:** Önce auth/session, sonra tenant membership, ardından modül aktivasyon kontrolü uygulanır.
5. **Varsayılan davranış güvenli olmalı:** Modül durumu belirsizse (kayıt yok / hatalı) davranış **kapalı** kabul edilir.

---

## Gelecek modüller (adaylar)

- **`e_invoice`**: e-fatura ve belge akışları
- **`job_manager`**: zamanlanmış işler ve operasyonel görev orkestrasyonu
- **`expense_app`**: gider yönetimi ve finansal operasyon yardımcı araçları

Bu modüller, core kuralları ve tenant izolasyonu değişmeden eklenir; her biri kendi domain verisini taşır.

---

## İlgili dokümanlar

- Ürün kapsamı ve cafe/loyalty odağı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Veri modeli ve migration ilkeleri: [`20-rules-003-data-model.md`](./20-rules-003-data-model.md)
- Güvenlik ve tenant izolasyonu: [`20-rules-005-security.md`](./20-rules-005-security.md)
