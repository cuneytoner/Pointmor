# Data Platform — üç ürün modeli (ürün mimarisi)

**Güncelleme:** **Data Registry**, **Agent**, derinleştirilmiş **Health / Governance lite / Lineage** ve Prisma tabloları için bkz. [**10-plan-006-data-platform-registry-agents-spec.md**](./10-plan-006-data-platform-registry-agents-spec.md).

**Durum:** Strateji ve yol haritası. Mevcut kod tabanı şu an **operatör admin + API** (Tenant, User, Plan, Subscription) odaklıdır; aşağıdaki üç ürün **ürün tanımı ve evrim planı** olarak ele alınmalıdır — tek seferde tam ürün seti kodlanmaz.

**İlkeler:** Overengineering yok, MVP bozulmaz, artımlı evrim, mevcut `apps/admin-web` + `apps/api` korunur ve genişletilir.

**Roadmap sırası (ürün stratejisi — güncel):**

1. **Phase 1–3:** Data Health → Governance → Data Lineage (veri platformu çekirdeği).
2. **Önce product–market fit** ve aktivasyon; veri platformu **tamamlığı**.
3. **Phase SaaS-1 — Usage & Enforcement:** limitler, kullanım, plan kapılarının icrası (**SaaS Core**).
4. **Phase SaaS-2 — Billing & Payments:** ödeme, faturalama, sağlayıcı entegrasyonu (**Billing**).

**Monetization** (gerçek para ve faturalama) **SaaS-2**’de ele alınır; **SaaS Core** ile karıştırılmaz — ayrıntı [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md).

---

## Mevcut sistem — kısa analiz

| Katman | Bugün |
|--------|--------|
| **UI** | `admin-web` — çok kiracılı operatör paneli iskeleti |
| **API** | Fastify, auth/pricing/bootstrap hatları, Bölüm 8–9 ile sıkılaşacak domain |
| **Veri** | PostgreSQL, Prisma; `Tenant`, `User`, `Plan`, `Subscription`, `AuditLog`; `Plan.featureTags` ile özellik işaretleme için kanca |
| **Eksik (bilinçli)** | Workspace tablosu (şemada `defaultWorkspaceId` hazırlığı var), veri kalitesi/governance/lineage domain tabloları yok |

**Sonuç:** Platform çekirdeği uygun; “üç ürün” **modül sınırları + yetenek paketleri** olarak eklenmeli, ayrı deploy birimlerine **ihtiyaç oluşunca** bölünmeli.

---

## 1. Ürün sınırları

### 1.1 Data Health (core)

| | |
|--|--|
| **Ne yapar** | Veri varlıklarının **ölçülebilir kalitesi**: profil, testler, skorlar, uyarılar, “sağlık” panosu; kiracı bazlı özet ve trend. |
| **Ne yapmaz** | Politika yazımı onayı (Governance), kolon-satır düzeyi köken grafiği (Lineage), harici BI aracının yerine geçmez. |
| **Bağımlılık** | **Platform:** Tenant, User, Auth, Billing (plan/limit). **Veri:** ölçülecek varlıkların tanımı (connection/asset/registry — Health’in beslendiği metadata). |

### 1.2 Data Governance

| | |
|--|--|
| **Ne yapar** | **Kurallar, sahiplik, sınıflandırma, onay akışları**, PII/duyarlılık etiketleri, politika ihlali tespiti (Health ile beslenebilir). |
| **Ne yapmaz** | Ham pipeline execution (ELT motoru değil), köken çizimi (Lineage). |
| **Bağımlılık** | **Platform** + **Health** (kalite metrikleri ihlal koşullarına girdi olabilir). İlk MVP’de “policy as data” + basit UI yeterli. |

### 1.3 Data Lineage

| | |
|--|--|
| **Ne yapar** | **Köken ve etki analizi**: tablo/kolon/pipeline düğümleri, yönlü graf, değişiklik etkisi (“bu kolon kırılırsa kimler etkilenir?”). |
| **Ne yapmaz** | Veri kalitesi skorunun hesaplanması (Health), iş kuralı onayı (Governance). |
| **Bağımlılık** | **Platform** + metadata/registry (hangi varlıklar var). İsteğe bağlı **Governance** (sınıflandırma düğümlere etiket). **En yüksek teknik karmaşa** burada. |

**Konuşma modeli:** Üçü aynı “suite” içinde; kullanıcı Health’ten Governance’e **derin link** (aynı varlık bağlamı), Lineage’ta düğüme tıklayınca Health skoru / Governance etiketi gösterilir — **tek navigasyon, ortak nesne kimliği** (asset id).

---

## 2. Ortak platform (mevcut + netleşecekler)

| Yetenek | Bugün | Evrim |
|---------|--------|--------|
| **User** | `User`, rol, `tenantId` | Workspace-scoped roller; OAuth yolu `plan-002-auth-identity-roadmap` ile uyumlu |
| **Workspace** | `defaultWorkspaceId` (nullable) | `Workspace` modeli + üyelik — çok ekip senaryosu |
| **Billing** | `Plan`, `Subscription`, `PlanType`, `featureTags` | Ürün kapıları: `dh`, `dg`, `dl` veya `data_health`, `data_governance`, `data_lineage` tag’leri |
| **Auth** | Oturum, rate limit yönü | httpOnly/JWT sertleştirme (Bölüm 9) |

**Öneri:** Özellik bayraklarını `featureTags` ile taşıyın; admin UI’da plan kartları bu tag’lere göre modül gösterir — **ticari katman tek kaynak** (`Plan`).

---

## 3. Mimari model

**Kısa cevap: Şimdilik *modüler monolit* (tek `api` + tek DB); servis ayrımı *tetikleyici* olduğunda.**

| Seçenek | Ne zaman |
|---------|----------|
| **Modüler monolith** | MVP ve ilk 12–18 ay: `apps/api` içinde **bounded context** klasörleri (`modules/data-health`, `modules/data-governance`, `modules/data-lineage`), ortak `platform` (tenant, auth, billing). |
| **Ayrı süreç / queue** | Lineage graf indeksleme, uzun süren parse işleri CPU-bound ise **worker** + kuyruk (aynı repo, ayrı deployable). |
| **Microservice** | Sadece **ekip ölçeği**, farklı release cadence veya regülasyon sınırı gerektiğinde; erken bölünme operasyon maliyetini artırır. |

**Neden monolit + modül:** Mevcut ekip ve kod tabanı ile uyumlu; transaction’lar ve migration tek Prisma şemasında kalır; “3 ürün” önce **ürün paketleri ve UI modülleri**, sonra gerektiğinde extract.

---

## 4. Veri modeli

**Öneri: Tek PostgreSQL veritabanı, tek Prisma şema dosyası; tablolar *domain önekli* veya modül klasöründe mantıksal gruplama.**

| Yaklaşım | Artı | Eksi |
|----------|------|------|
| **Shared schema (önerilen)** | Basit join, tek migration, operasyonel maliyet düşük | Disiplin: modül tablolarına FK kuralları net olmalı |
| **Ayrı DB/schema (Lineage ağırlıklı)** | Ağır graf yükü izole | Dağıtık transaction, iki migration hattı, karmaşıklık |

**Evrim:** Lineage için ayrı **read model** (ör. graph store) eklenebilir; operasyonel kayıt hâlâ Postgres’te kalır, **projeksiyon/event** ile senkron.

---

## 5. Event modeli

Ürünler **senkron REST** ile başlar; olaylar **“sonra birinci vatandaş”** olur.

**Önerilen minimal yapı:**

1. **Domain event** (uygulama içi): `DataAssetCreated`, `HealthScoreComputed`, `PolicyViolationDetected`, `LineageGraphUpdated`.
2. **Taşıma:** Önce **transaction içi** veya **basit outbox tablosu** (`OutboxEvent`: id, type, payload JSON, createdAt, processedAt) + arka plan işçisi.
3. **Tüketici:** Aynı API sürecinde async handler veya ayrı `worker` — Lineage indeks güncellemesi, bildirim, denetim günlüğü.

**Payload ilkesi:** `eventType`, `tenantId`, `workspaceId?`, `occurredAt`, `correlationId`, `payload` (version’lı JSON şema — ileride contract test).

**Ürünler arası “konuşma”:** Health skoru değişince Governance ihlal kurallarını yeniden değerlendir; bu **event aboneliği** veya **scheduled recompute** ile yapılabilir — MVP’de **kullanıcı tetikli yenileme** yeterli olabilir.

---

## 6. Repo yapısı (hedef)

Mevcut `apps/*` korunur; modülerleşme için hedef:

```
apps/
  admin-web/          # Modül bazlı route'lar: /data-health, /governance, /lineage
  api/
    src/
      platform/       # auth, tenant, billing, ortak middleware
      modules/
        data-health/
        data-governance/
        data-lineage/
      generated/      # Prisma
packages/             # (isteğe bağlı, 2. faz)
  contracts/        # paylaşılan event/DTO tipleri
  ui-kit/             # ortak admin bileşenleri
```

**Not:** `packages/` boş kalabilir; önce `api/src/modules` yeterli — **kod taşınabilirliği** öncelik.

---

## 7. Sprint / evrim planı

| Faz | Odak | Çıktı |
|-----|------|--------|
| **0 — Platform sağlamlaştırma** | Bölüm 8–9 API, auth, webhook, plan/subscription gerçek veri | Faturalama ve `featureTags` üretimde güvenilir |
| **1 — Data Health (önce bu)** | Asset registry + temel profil + skor/uyarı MVP | Satılabilir “core” değer, pano |
| **2 — Data Governance** | Politika + sahiplik + basit ihlal/uyarı | Kurumsal satış hikâyesi |
| **3 — Data Lineage** | Metadata ingest + graf MVP + etki analizi (dar kapsam) | En yüksek mühendislik; sonra genişlet |

**Neden Health önce:** Tek başına değer üretir (ölçülebilirlik); Governance ve Lineage onun veya registry üzerine oturur; MVP’yi şişirmeden “ilk ücretli modül” olabilir.

---

## 8. Monetization

- **Plan bazlı:** `Plan.featureTags` içinde ürün anahtarları (`data_health`, `data_governance`, `data_lineage`).
- **Feature gating:** API middleware + admin route guard; kota (ör. asset sayısı, günlük tarama) `Plan` veya ayrı `Entitlement` tablosu ile (ileride).
- **Kademe:** Free = sınırlı Health özeti; Pro = Health tam + temel Governance; Team/Enterprise = Lineage + gelişmiş Governance.

---

## 9. Risk analizi

| Risk | Azaltma |
|------|---------|
| **Karmaşıklık** | Üç ürünü aynı anda kodlamak yerine sırayla modül ekleme |
| **Küçük ekip** | Monolit + modül; microservice yok |
| **Ölçek** | Önce Postgres; Lineage grafı için read replica veya ayrı graph store gecikmeli |
| **Scope creep** | Her modül için “ne yapmaz” tablosu sprint gate’i |

---

## Çıktı özeti

| # | Teslim | Özet |
|---|--------|------|
| 1 | **Ürün mimarisi** | Health (core) → Governance → Lineage; ortak asset/registry ve platform |
| 2 | **Repo yapısı** | `apps/api/src/modules/{data-health,data-governance,data-lineage}` + `platform` |
| 3 | **Veri modeli** | Tek DB; modül tabloları; Lineage için ileride projeksiyon |
| 4 | **Event modeli** | Domain event + outbox (hafif); ürünler arası gevşek bağlı |
| 5 | **Roadmap** | Platform sıkılaştırma → Health → Governance → Lineage |
| 6 | **Net öneri** | **Data Health ile başla** — çekirdek değer, düşük entegrasyon riski, mevcut billing tag’leriyle paketlenebilir |

---

*Bu belge [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md) ve [`10-plan-004-acquisition-and-pricing.md`](./10-plan-004-acquisition-and-pricing.md) ile uyumlu tutulmalı; teknik ayrıntılar ileride `20-rules-002-architecture.md` / `20-rules-003-data-model.md` güncellemeleriyle hizalanır.*
