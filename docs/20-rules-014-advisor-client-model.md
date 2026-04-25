# Advisor–Client üyelik modeli kuralları

**Amaç:** Advisor (Steuerberater) kullanıcılarının çok kiracılı platformda client tenant’lara güvenli ve izlenebilir şekilde erişmesini, tenant izolasyonunu bozmadan tanımlamak.

---

## Tanımlar

| Kavram | Tanım |
|--------|-------|
| **ADVISOR tenant** | Danışmanlık organizasyonunu temsil eden tenant tipi |
| **BUSINESS tenant** | İşletmeyi (müşteri firma) temsil eden tenant tipi |

---

## Roller

| Rol | Anlam |
|-----|-------|
| **ADMIN** | Tenant yönetim yetkilerine sahip üye |
| **MEMBER** | Tenant içinde standart operasyonel üye |
| **ADVISOR** | Danışman erişimi için tanımlı üye rolü |

---

## Membership kuralları

1. Kullanıcılar birden fazla tenant’a üye olabilir.
2. Üyelik tenant bazlıdır; her tenant için rol ayrı değerlendirilir.
3. Advisor kullanıcı, kendi ADVISOR tenant’ına ek olarak bir veya daha fazla BUSINESS tenant’ta üyeliğe sahip olabilir.
4. Tenant erişimi yalnızca ilgili tenant üyeliği üzerinden kurulur.

---

## `isExternal` alanı (anlamı)

- **`isExternal = true`**: Kullanıcı ilgili tenant için dış paydaş (örn. dış advisor) olarak işaretlenir.
- **`isExternal = false`**: Kullanıcı ilgili tenant içinde iç kullanıcı olarak değerlendirilir.

**Kural:** `isExternal`, üyelik bağlamında sınıflandırma bilgisidir; tek başına yetki vermez.

---

## Erişim kuralları

**Erişim doktrini:** **All access control is based on: membership + role + module activation**

1. Tüm erişim denetimi membership tabanlı yapılır.
2. Global / sınırsız tenant erişimi yoktur (platform admin istisnası dışında).
3. Kullanıcı bir tenant’a üye değilse o tenant için UI veya API erişimi alamaz.
4. Advisor rolü tenant izolasyonunu gevşetmez; yalnızca üye olunan tenant’larda geçerlidir.

---

## Davet akışı (invitation flow)

1. Advisor (veya yetkili üye) kullanıcıyı belirli tenant’a davet eder.
2. Davet tenant, rol ve gerekiyorsa `isExternal` bilgisi içerir.
3. Davet kabul edildiğinde hedef tenant için membership oluşturulur.
4. Erişim davet kabulü sonrası oluşan membership üzerinden başlar.

---

## Mevcut sürüm sınırlamaları

- Bu sürümde ayrı bir **`AdvisorClientRelationship`** tablosu yoktur.
- Advisor–client bağı, doğrudan membership kayıtları üzerinden temsil edilir.

---

## Gelecek genişletme notu

İleride ihtiyaç oluşursa advisor organizasyonu ile client tenant arasında açık ilişki semantiği için ayrı bir ilişki tablosu (örn. `AdvisorClientRelationship`) eklenebilir. Bu ekleme membership tabanlı erişim kuralını değiştirmez; yalnızca ilişkiyi daha görünür ve yönetilebilir hale getirir.

---

## İlgili dokümanlar

- Platform modüler mimari: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
- Güvenlik ve tenant izolasyonu: [`20-rules-005-security.md`](./20-rules-005-security.md)
