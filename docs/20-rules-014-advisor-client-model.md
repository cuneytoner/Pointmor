# Advisor–Client üyelik modeli kuralları

**Amaç:** Advisor (Steuerberater) kullanıcılarının çok kiracılı platformda client tenant’lara güvenli ve izlenebilir şekilde erişmesini, tenant izolasyonunu bozmadan tanımlamak.

---

## Tanımlar

| Kavram | Tanım |
|--------|-------|
| **ADVISOR tenant** | Danışmanlık organizasyonunu temsil eden tenant tipi |
| **BUSINESS tenant** | İşletmeyi (müşteri firma) temsil eden tenant tipi |

---

## Role'ler

| Role | Anlam |
|-----|-------|
| **ADMIN** | Tenant yönetim yetkilerine sahip üye |
| **MEMBER** | Tenant içinde standart operasyonel üye |
| **ADVISOR** | Danışman erişimi için tanımlı üye role'ü |

---

## Membership kuralları

1. Kullanıcılar birden fazla tenant’a üye olabilir.
2. Üyelik tenant bazlıdır; her tenant için role ayrı değerlendirilir.
3. Advisor kullanıcı, kendi ADVISOR tenant’ına ek olarak bir veya daha fazla BUSINESS tenant’ta üyeliğe sahip olabilir.
4. Tenant erişimi yalnızca ilgili tenant üyeliği üzerinden kurulur.

---

## `isExternal` alanı (anlamı)

- **`isExternal = true`**: Kullanıcı ilgili tenant için dış paydaş (örn. dış advisor) olarak işaretlenir.
- **`isExternal = false`**: Kullanıcı ilgili tenant içinde iç kullanıcı olarak değerlendirilir.

**Kural:** `isExternal`, üyelik bağlamında sınıflandırma bilgisidir; tek başına yetki vermez.

---

## Erişim kuralları

**Erişim doktrini:** **Tüm access control şu temele dayanır: membership + role + module activation**

1. Tüm erişim denetimi membership tabanlı yapılır.
2. Global / sınırsız tenant erişimi yoktur (platform admin istisnası dışında).
3. Kullanıcı bir tenant’a üye değilse o tenant için UI veya API erişimi alamaz.
4. Advisor role'ü tenant izolasyonunu gevşetmez; yalnızca üye olunan tenant'larda geçerlidir.

---

## Davet akışı (invitation flow)

1. Advisor (veya yetkili üye) kullanıcıyı belirli tenant’a davet eder.
2. Davet tenant, role ve gerekiyorsa `isExternal` bilgisi içerir.
3. Davet kabul edildiğinde hedef tenant için membership oluşturulur.
4. Erişim davet kabulü sonrası oluşan membership üzerinden başlar.

---

## Invitation acceptance flow

Token-based kabul akışı:

1. Kullanıcı oturum açmış olmalıdır (authenticated).
2. Davet token’ı ile `TenantInvitation` kaydı bulunur.
3. Kullanıcı e-postası davetteki e-posta ile birebir eşleşmelidir.
4. Geçerli davette membership oluşturulur (`userId`, `tenantId`, `role`, `isExternal`).
5. Mevcut membership varsa duplicate oluşturulmaz (idempotent kabul).
6. Davet kaydı `ACCEPTED` olarak işaretlenir.

Kısıtlar:

- Invitation tek başına erişim vermez; erişim yalnız membership oluştuktan sonra başlar.
- `isExternal=true` davetlerde `ADMIN` role'ü kabul edilmez (external advisor limiti).

---

## Mevcut sürüm sınırlamaları

- Bu sürümde ayrı bir **`AdvisorClientRelationship`** tablosu yoktur.
- Advisor–client bağı, doğrudan membership kayıtları üzerinden temsil edilir.

---

## Gelecek genişletme notu

İleride ihtiyaç oluşursa advisor organizasyonu ile client tenant arasında açık ilişki semantiği için ayrı bir ilişki tablosu (örn. `AdvisorClientRelationship`) eklenebilir. Bu ekleme membership tabanlı erişim kuralını değiştirmez; yalnızca ilişkiyi daha görünür ve yönetilebilir hale getirir.

---

## İlgili dokümanlar

- Platform module mimarisi: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Güvenlik ve tenant izolasyonu: [`20-rules-005-security.md`](./20-rules-005-security.md)
