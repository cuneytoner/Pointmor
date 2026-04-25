# Mimari kuralları

**Amaç:** Pointmor'un module tabanlı çok kiracılı mimarisinde katman sorumluluklarını, sınırlarını ve bağımlılık yönünü netleştirmek.

---

## Özet kararlar

| Katman | Sorumluluk |
|--------|------------|
| **API** | Kimlik doğrulama, tenant context çözümü, membership/role/module kontrolleri, sözleşmeli response |
| **Service** | Tenant-scoped iş kuralları ve use-case orkestrasyonu |
| **Database** | Yapısal bütünlük (FK, unique, index) ve tenant-bound veri modeli |
| **Module layer** | Domain fonksiyonlarının izole edilmesi (`cafe`, `ai_act`, vb.) |

**Temel ilke:** Core platform ortak, domain davranışı module bazlıdır.

---

## Platform katmanları

### API layer

- Her istek tenant bağlamına çözülür.
- Access control: membership + role + module activation.
- API, service katmanına yetkisiz çağrı geçirmez.

### Service layer

- İş kuralları tenant kapsamı dışında çalışmaz.
- API guard’larını bypass eden arka kapı iş akışı olmamalıdır.
- Service çağrıları tenant context ile çalışır ve gerektiğinde yeniden doğrular.

### Database layer

- Tenant-scoped tablolar `tenantId` içerir.
- Foreign key, unique ve index kuralları açık tanımlanır.
- DB yapısal güvence sağlar; access control’ün tamamını tek başına garanti etmez.

### Module layer

- Module'ler domain izolasyonu ile çalışır.
- Module verisi tenant scoped olmalıdır.
- Module'ler core kimlik/üyelik modelini değiştirmez.

---

## Multi-tenant sınırları

1. Tenant izolasyonu varsayılandır.
2. Cross-tenant erişim membership olmadan mümkün değildir.
3. `tenantId` tüm tenant-scoped sorgularda zorunlu scope alanıdır.
4. Bir request yaşam döngüsü boyunca tek tenant context içinde çalışır.

---

## Module isolation kuralları

1. Module activation tenant bazlıdır (`TenantModule`).
2. Pasif module tenant için API/UI yüzeyi açmaz.
3. Module sınırları arası coupling en düşük seviyede tutulur.
4. Module, core tablo davranışını mutasyona zorlayamaz.

---

## API boundary kuralları

- Route katmanı: doğrulama + yetkilendirme + orchestration.
- Service katmanı: iş kuralı.
- Repository/DB erişimi: tenant filtreli ve açık.
- Frontend istemcisi doğrudan DB modeline bağlanmaz; yalnız API sözleşmesini tüketir.

---

## Anti-pattern’ler

- `tenantId` olmadan sorgu çalıştırmak.
- Membership doğrulaması olmadan tenant verisi döndürmek.
- Bir module'ün başka module domain akışını doğrudan kontrol etmesi.
- Route içinde policy bypass eden shortcut erişim.

---

## Kısa checklist

- [ ] İstek tek tenant context’e bağlanıyor mu?
- [ ] Membership/role/module activation kontrolleri var mı?
- [ ] Sorgular tenantId ile scope ediliyor mu?
- [ ] Module sınırı ve core sınırı korunuyor mu?

---

## İlgili dokümanlar

- Core platform tanımı: [10-meta-004-core-platform-definition.md](./10-meta-004-core-platform-definition.md)
- Veri modeli: [20-rules-003-data-model.md](./20-rules-003-data-model.md)
- API kuralları: [20-rules-004-api-design.md](./20-rules-004-api-design.md)
- Güvenlik: [20-rules-005-security.md](./20-rules-005-security.md)
- Module kuralları: [20-rules-013-platform-modules.md](./20-rules-013-platform-modules.md)
