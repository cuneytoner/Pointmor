# Cross-tenant access güvenlik kuralları

**Amaç:** Çok kiracılı mimaride ve advisor kullanım senaryolarında tenant izolasyonunu katı şekilde korumak; veri sızıntısı ve yetki aşımı risklerini önlemek.

---

## Çekirdek prensip

**Varsayılan güvenlik modeli:** **Tenant isolation by default**.

Bu ilke gereği her veri erişimi ve her iş akışı tenant sınırı içinde çalışır; sınır dışı erişim ancak açık ve doğrulanmış membership ile mümkündür.

---

## Erişim kuralları

**Erişim doktrini:** **Tüm access control şu temele dayanır: membership + role + module activation**

1. Erişim yalnızca membership üzerinden verilir.
2. Advisor erişimi için hedef tenant’ta açık membership zorunludur.
3. Membership olmayan tenant için UI, API ve export access verilmez.
4. Role bilgisi membership bağlamında değerlendirilir; tenant dışına taşınamaz.
5. Erişim yalnızca `TenantMembership` oluştuktan sonra başlar.
6. Invitation tek başına access vermez.

---

## Yasak desenler

- Tenant filtresi olmadan global sorgu (`findMany` / rapor / export) çalıştırmak.
- “Kullanıcı advisor ise görebilir” gibi membership doğrulaması olmayan örtük erişim.
- Oturumdaki aktif tenant dışında veri çekmek için örtük fallback davranışı.
- Çok tenant verisini tek payload’da tenant ayrımı olmadan döndürmek.

**Kural:** Bu desenler güvenlik ihlali kabul edilir.

---

## API kuralları

Her tenant-scoped istek için aşağıdaki doğrulama zorunludur:

1. `tenantId` açıkça belirlenir (path/query/body/session bağlamı net olmalı).
2. İsteği yapan kullanıcı için ilgili `tenantId` membership’i doğrulanır.
3. Role/permission kontrolü membership sonrası uygulanır.
4. Doğrulama başarısızsa istek reddedilir (`403` / `401`).

**Kural:** `tenantId + membership` doğrulaması olmadan hiçbir tenant verisine erişilemez.

---

## Audit log kuralları

Cross-tenant riski taşıyan tüm kritik işlemlerde audit kaydı aşağıdaki alanları içermelidir:

- **actor user**: işlemi yapan kullanıcı kimliği
- **actor tenant**: işlemin yapıldığı aktif tenant bağlamı
- **target tenant**: erişilen veya etkilenen tenant

**Kural:** Actor ve target tenant ayrımı logda görünür olmalıdır.

---

## External advisor kuralları

1. `isExternal = true` kullanıcılar varsayılan olarak sınırlı yetki yaklaşımı ile ele alınır.
2. External advisor, açık atama olmadan tam admin yetkisi alamaz.
3. External advisor yetkileri explicit role + permission ile tanımlanır; otomatik yükseltme yoktur.
4. Advisor erişimi tenant bazında ayrı ayrı sınırlandırılır.

---

## Export güvenlik kuralları

1. Export çıktıları tek tenant kapsamı ile üretilir.
2. Cross-tenant veri birleştirme (tek dosyada çok tenant) varsayılan olarak yasaktır.
3. Export sorguları membership ve tenant filtresi olmadan çalıştırılamaz.
4. Export çıktılarında tenant dışı veri tespiti kritik olay olarak ele alınır.

**Kural:** Export yüzeyi veri sızıntısına karşı en sıkı tenant filtresi ile korunur.

---

## İlgili dokümanlar

- Genel güvenlik kuralları: [`20-rules-005-security.md`](./20-rules-005-security.md)
- Advisor–client üyelik modeli: [`20-rules-014-advisor-client-model.md`](./20-rules-014-advisor-client-model.md)
- Platform module mimarisi: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
