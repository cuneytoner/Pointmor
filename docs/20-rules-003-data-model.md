# Veri modeli kuralları

**Amaç:** Domain’e sadık, migration dostu, revizyon güvenli ve API’den bağımsız iç model.

---

## Özet kararlar

| Konu | Kural |
|------|--------|
| İç model | **Internal document** JSON’u version alanlı; parser/renderer sürümü bu alana göre. |
| DB ≠ UI | API response ve UI DTO, DB satırının birebir kopyası olmak zorunda değil. |
| Revizyon | Yayınlanmış içerik **üzerine yazılmak yerine** yeni revision tercih edilir (ürün kuralı ile). |
| Genişleme | Yeni alan **nullable veya default** ile; breaking change migration planlı. |

---

## Ana prensipler

1. **Domain-first:** Entity isimleri iş kavramına uygun (Document, Share; çok kiracılı yapıda **Workspace** — ürün dili; kodda geçici `tenant` alan adı kalabilir). Tutarlı tablo: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md) **Ortak terminoloji**.
2. **API payload ile DB’yi eşitlememe:** Tablo alanları stabil; client’a giden alanlar ihtiyata göre seçilir.
3. **Future-proof:** “Belki lazım” diye 20 nullable kolon açma; gerçekten roadmap’teyse ekle.
4. **Explicit fields:** `metadata JSON` içine gizli iş kuralları yığma; sık sorgulanan şey kolon olmalı.

---

## Ana entity’ler (hedef çerçeve)

| Entity | Rol |
|--------|-----|
| **User** | Kimlik, profil, sahiplik. |
| **Document** | Kimlik, sahip, slug, güncel revision işaretçisi, visibility özeti. |
| **DocumentRevision** | İçerik snapshot (JSON), oluşturulma nedeni, kaynak metadata. |
| **ShareLink / Access** | Unlisted token, süre, şifre hash, izin seviyesi. |
| **BrandKit** | Logo, renk, font referansı (URL veya asset id). |
| **EmailSendLog** | Gönderim durumu, ilişki, hata (PII minimum). |
| **Subscription** | Plan, durum, dönem (billing için). |
| **AnalyticsEvent** | Olay tipi, document id, zaman damgası; PII’siz tasarım. |
| **Team / Workspace** (ileride) | Çok kiracılı yapı için org sınırı. |

---

## Internal / normalized document model

- **`version` zorunlu** (örn. `1`); şema değişince major artırılır veya migration tablosu.
- **Backward compatibility:** Eski revision’lar okunabilir kalmalı; eski blok tipleri **unknown** olarak taşınabilir.
- **Unsupported block:** `type: "unsupported"` veya orijinal tip + `fallback: true` + ham alan sınırlı.
- **Block id:** Kaynak stabil id veya üretilmiş `nanoid`; çakışma yok.

---

## Document lifecycle

```
import → normalize → validate → (store revision) → render → publish → export → archive
```

- Her adımın çıktısı mümkünse **loglanabilir** (audit için).
- **Archive:** Soft delete + listeden gizleme; hard delete ürün politikası ile.

---

## Visibility modeli

| Seviye | Kullanım |
|--------|----------|
| **public** | İndeks, herkes. |
| **unlisted** | Token veya tahmin edilmez URL. |
| **password** | Sunucu tarafı doğrulama; hash asla client’ta doğrulanmaz tek başına. |
| **profile** | Oturum + sahiplik/policy. |

Kurallar tek tabloda `enum` + ek tablolar (share token) ile net ayrılmalı.

---

## Slug

- **Format:** küçük harf, ASCII, tire; unicode slug ürün kararı ile transliterate.
- **Uniqueness:** Global veya workspace başına scope net tanımlı.
- **Collision:** Kısa random suffix veya sayı; race için DB unique constraint.
- **Immutable:** Slug değişirse **301** veya yeni slug + eski redirect kaydı (kırık link önleme).

---

## Revision kuralları

- **Yeni revision:** İçerik değişikliği yayınlandığında; import yenilendiğinde (ürün kararı).
- **Overwrite yok:** Üretimde aynı revision id’sinin içeriği değişmez (immutability).
- **Source metadata:** `source: { type, id, url?, syncedAt }` revision veya document seviyesinde tutarlı.

---

## Billing ve capability

- Özellik bayrakları **subscription/plan** ile bağlanır; kod içinde `if (user.email === …)` bypass yok.
- Limitler (PDF sayısı, export) sayaç veya plan tablosundan.

---

## Analytics

- Olay şeması: `name`, `documentId`, `timestamp`, `properties` (düşük cardinality).
- PII analytics tablosunda tutulmaz (email hash istisnası ayrı değerlendirme).

---

## Soft delete ve audit

- **Soft delete:** `deletedAt` + sorgularda filtre.
- **Audit alanları:** `createdAt`, `updatedAt`, mümkünse `createdBy` (admin işlemleri için).

---

## Migration

- **Destructive:** Veri kaybı varsa backup + changelog + rollback planı.
- **Seed:** Sadece dev/staging; production’da otomatik seed yok (istisna dokümante).
- **Test data:** Fixture’lar repo’da veya seed script; prod verisi asla.
- **Deploy pipeline’da migration sırası ve rollback pratiği:** [20-rules-006-deployment-and-ops.md](./20-rules-006-deployment-and-ops.md) — şema *kararı* burada, *uygulama sırası* orada.

---

## Anti-pattern’ler

- Devasa JSON blob’a her şeyi gömmek (sorgulanamayan iş kuralları).
- UI modelini DB kolonları sanmak.
- Yayın içeriğini revision olmadan update etmek (iz sürülemez).
- JSON içinde başka JSON string’leri (double encoding) — kaçınılmalı.

---

## Kısa checklist

- [ ] Yeni alan gerçekten sorgulanıyor mu?
- [ ] Revision stratejisi net mi?
- [ ] Slug scope ve uniqueness DB’de garanti mi?
- [ ] Migration geri alınabilir mi?

---

## İlgili dokümanlar

- **API resource isimleri ve DTO**: [20-rules-004-api-design.md](./20-rules-004-api-design.md).
- **Paylaşım token / güvenlik**: [20-rules-005-security.md](./20-rules-005-security.md) ile `visibility` birlikte düşünülür.
- **İndeks ve Workspace/Document tanımları**: [10-meta-001-rules-index.md](./10-meta-001-rules-index.md).
