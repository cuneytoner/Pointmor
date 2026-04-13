# Mühendislik kuralları

**Amaç:** Kod kalitesi, test disiplini ve ekip + AI ile güvenli geliştirme pratiği.

---

## Özet kararlar

| Alan | Standart |
|------|-----------|
| Dil | TypeScript strict; `any` istisna ve gerekçeli. |
| PR | Küçük, tek konu; devasa “cleanup” ile feature karışmaz. |
| DoD | Lint + typecheck + build + smoke + ilgili doküman güncellemesi. |
| AI/Cursor | Önce plan ve dosya sınırları; kurallara referans. |

---

## Kod yazımı

1. **İsimlendirme:** `getUserById`, `normalizeBlocks` — fiil + bağlam; kısaltma (`tmp`, `data1`) yok.
2. **Küçük fonksiyonlar:** Tek seviye soyutluk; 80 satır üstü sinyal (böl).
3. **Yorumlar:** **Neden** yapıldığı; açık kod **ne** yaptığını anlatır.
4. **Tip güvenliği:** `unknown` üzerinde daralt; harici API için Zod/schema.
5. **Hata:** Yakalanabilir hatalar typed veya anlamlı mesaj; boş `catch` yasak (log veya rethrow).

---

## PR ve commit

- **Küçük batch:** Bir PR = bir özellik veya bir bugfix + test.
- **Commit mesajları:** Imperatif kısa özet; gövde isteğe bağlı bağlam.
- **Refactor:** Davranış değişmez; ayrı commit veya açık PR başlığı.
- **TODO:** `TODO(owner|issue): açıklama` — sahipsiz TODO birikmez.

---

## Test stratejisi

| Seviye | Ne zaman |
|--------|-----------|
| **Lint** | Her commit / CI. |
| **Typecheck** | Her PR. |
| **Build** | Her PR. |
| **Smoke** | Kritik akış (login, import, export) — manuel veya otomasyon. |
| **Unit** | Pure fonksiyonlar: normalize, slug, parse. |
| **Integration** | API + DB (test container veya sqlite). |
| **E2E** | Ana kullanıcı yolları; maliyetli olduğu için seçici. |

**Zorunluluk özeti:**

- Para / auth / içerik dönüşümü → en azından unit + bir integration veya e2e smoke.
- Sadece CSS copy → lint + görsel kontrol.

**Mock vs gerçek:** Birim testinde mock; entegrasyonda mümkünse gerçek DB veya contract test.

---

## Logging

- **Seviye:** `error` / `warn` / `info` / `debug` — prod’da debug kapalı.
- **Asla loglama:** Şifre, token, tam kart, ham PII (ayrıntı [rules-005-security.md](./rules-005-security.md)).
- **Yapılandırılmış log:** JSON satırı (ortam uygunsa) — arama kolaylığı.

---

## Debug ve feature flag

- `console.log` geçici; merge öncesi kaldır veya logger’a çevir.
- **Feature flag:** Uzun süreli deneme veya riskli rollout; `if (env)` dağınığı yerine tek modül (`features.ts`).

---

## AI / Cursor ile çalışma

1. **Büyük refactor:** Önce bu dokümanlara uygun plan (dosya listesi, risk).
2. **Dosya üretmeden:** Mevcut klasör ve naming ile uyum; yeni pattern icat etme.
3. **Kurallar:** Önce [meta-001-rules-index.md](./meta-001-rules-index.md) (terminoloji ve çakışmasız konu sahipliği), sonra ilgili `docs/*-rules.md` ve `.cursor/rules`.
4. **Dağınık kod:** Tek görevde gereksiz 10 dosya oluşturma; minimum değişiklik.

---

## Definition of Done

- [ ] Kod çalışıyor (local veya review ortamı).
- [ ] Lint ve typecheck temiz.
- [ ] Build geçiyor.
- [ ] İlgili smoke veya test eklendi/güncellendi.
- [ ] API veya model değiştiyse ilgili `docs/` veya OpenAPI notu.
- [ ] Güvenlik yüzeyi değiştiyse `rules-005-security.md` kontrolü.

---

## Kısa checklist

- [ ] Bu değişiklik tek sorumluluk mu?
- [ ] Hata yolu kullanıcıya veya operatöre anlamlı mı?
- [ ] Teknik borç issue’ya yazıldı mı?

---

## İlgili dokümanlar

- **CI, deploy, migration çalıştırma**: [rules-006-deployment-and-ops.md](./rules-006-deployment-and-ops.md).
- **Güvenlik DoD ve log/PII**: [rules-005-security.md](./rules-005-security.md).
- **i18n DoD (metin, anahtar)**: [rules-010-i18n.md](./rules-010-i18n.md).
- **Merkez indeks**: [meta-001-rules-index.md](./meta-001-rules-index.md).
