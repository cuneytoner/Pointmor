# Platform module mimari kuralları

**Amaç:** Pointmor'un çok kiracılı çekirdeğini koruyarak, ürün alanlarını module bazlı genişletmek; mevcut `cafe` işlevlerini platform içinde bir module olarak sürdürmek.

---

## Tanım: Çekirdek Platform ve Module

| Katman | Sorumluluk |
|--------|-------------|
| **Core Platform** | Kimlik, tenant, membership, auth, session, plan/abonelik, tenant izolasyonu, module activation altyapısı |
| **Module** | Belirli iş alanı (örn. cafe, AI aksiyon, e-fatura), tenant kapsamında API/UI ve alan verisi |

**Kural:** Core platform, module'lerin çalıştığı güvenli temel katmandır; module alanları core'u bypass etmez.

**Erişim doktrini:** **Tüm access control şu temele dayanır: membership + role + module activation**

---

## Temel kurallar

1. **Core sahipliği sabittir:** `users`, `tenants`, `memberships`, `auth/session` yalnızca core sorumluluğundadır.
2. **Module core entity değiştiremez:** Module'ler core tablolarda iş kuralı mutasyonu yapmaz; core verisini yalnızca izinli okuma/bağlantı amacıyla kullanır.
3. **Tenant scope zorunludur:** Module verisi tenant kapsamlıdır; cross-tenant erişim yalnızca core membership/policy kontrolü ile mümkündür.
4. **Erişim membership tabanlıdır:** Her module API/UI erişimi aktif tenant + membership bağlamında değerlendirilir.
5. **Mevcut cafe alanı korunur:** Var olan loyalty/cafe işlevleri kaldırılmaz; platform içinde `cafe` module olarak konumlanır.

---

## Module sistemi tasarımı

### Module

Platform genelinde module kataloğunu tanımlar.

- `id`
- `name` (örn. `cafe`, `ai_act`, `e_invoice`)
- `description`

### TenantModule

Tenant bazında module durumunu tanımlar.

- `tenant_id`
- `module_id`
- `is_active`

**Kural:** Bir module'ün tenant içinde çalışabilmesi için `TenantModule.is_active = true` olmalıdır.

---

## Örnek module'ler

| Module | Durum | Açıklama |
|------|------|----------|
| **`cafe`** | Mevcut | Loyalty/cafe operasyonları (müşteri, ziyaret, ödül, redemption, cashier vb.) |
| **`ai_act`** | Yeni (ilk non-loyalty) | B2B compliance odaklı AI Act uyum süreçleri |

---

## Activation kuralları

1. **Tenant bazlı aç/kapa:** Module etkinliği tenant seviyesinde yönetilir.
2. **Pasif module görünmez:** `is_active = false` olan module UI menü, ekran ve aksiyon üretmez.
3. **Pasif module API vermez:** Pasif module'e ait route/iş akışı tenant için veri üretmez ve işlem kabul etmez.
4. **Guard sırası:** Önce auth/session, sonra tenant membership, ardından module activation kontrolü uygulanır.
5. **Varsayılan davranış güvenli olmalı:** Module durumu belirsizse (kayıt yok / hatalı) davranış kapalı kabul edilir.

---

## Gelecek module'ler (adaylar)

- **`e_invoice`**: e-fatura ve belge akışları
- **`job_manager`**: zamanlanmış işler ve operasyonel görev orkestrasyonu
- **`expense_app`**: gider yönetimi ve finansal operasyon yardımcı araçları

Bu module'ler, core kuralları ve tenant izolasyonu değişmeden eklenir; her biri kendi domain verisini taşır.

---

## İlgili dokümanlar

- Ürün kapsamı ve cafe/loyalty odağı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Veri modeli ve migration ilkeleri: [`20-rules-003-data-model.md`](./20-rules-003-data-model.md)
- Güvenlik ve tenant izolasyonu: [`20-rules-005-security.md`](./20-rules-005-security.md)
