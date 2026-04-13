# Data Platform — Registry, Agent, Health, Governance, Lineage (genişletilmiş mimari)

**Durum:** Ürün ve teknik spesifikasyon. **Prisma şeması** (`apps/api/prisma/schema.prisma`) bu belgeyle uyumlu genişletildi; migration: `20260412055838_data_registry_health_governance_lineage_agents`.

**Önceki özet:** [`10-plan-005-data-platform-three-products.md`](./10-plan-005-data-platform-three-products.md).

**İlkeler:** Parçalanmadan büyüyen modüler monolit; veri merkezli; MVP’yi şişirmeden incremental. **Güncel:** kontrollü **policy engine** (sabit kural tipleri, DSL yok) ve **violation** akışı Phase 2’de vardır; **approval workflow** hâlâ yok.

---

## 1. Data Registry katmanı (kritik ortak tabaka)

Tüm ürünler **aynı kimlik uzayında** `DataSource` → `DataSchema` (mantıksal şema) → `DataAsset` → `DataColumn` hiyerarşisini kullanır. Registry yoksa Health/Governance/Lineage **birbirinden kopuk** kalır; bu yüzden **Sprint 1’in zorunlu çıktısı** registry API + minimum UI veya import köprüsüdür.

| Entity | Rol |
|--------|-----|
| **DataSource** | Bağlantı tanımı; `kind` (postgres, s3, …); kimlik `connectionSecretRef` ile vault’a işaret eder (ham secret DB’de tutulmaz). |
| **DataSchema** | Kaynak içi şema adı (`public`, `analytics`); `@@unique([dataSourceId, name])`. |
| **DataAsset** | Tablo / view / dosya / stream; `kind`; isteğe bağlı `externalFqn`. |
| **DataColumn** | Kolon metadata; `ordinal`, `nativeType`, `nullable`. |
| **Workspace** | İsteğe bağlı kapsam; `DataSource` buna bağlanabilir (`workspaceId` nullable). |

**Kural:** Health kuralları, governance kayıtları ve lineage düğümleri **doğrudan `DataAsset` / `DataColumn` FK** ile bağlanır; böylece ürünler “aynı nesne” üzerinden konuşur.

---

## 2. Agent mimarisi

**Agent = zaman uyumsuz iş birimi**; ayrı mikroservis şart değil: `AgentJob` tablosu + API’de kuyruk tetikleyici + ileride ayrı `worker` süreci.

### Tipler (enum)

| `AgentJobType` | İş |
|----------------|-----|
| `metadata_scan` | Kaynaktan şema/tablo/kolon keşfi → registry güncelleme |
| `profiling` | `ProfilingSnapshot` üretimi (istatistik JSON) |
| `quality_execution` | `QualityRule` çalıştırma → `QualityEvaluation` / bulgu |

### Yaşam döngüsü

1. API `POST` veya zamanlayıcı `AgentJob` oluşturur (`status=queued`, `input` JSON: hedef `dataSourceId` / `dataAssetId` listesi).
2. Worker (şimdü API içi async veya ayrı süreç) işi alır → `running` → sonuç `result` JSON veya hata `error`.
3. Başarıda `succeeded`, registry/health tabloları güncellenir.

### Konuşma

- **Senkron:** Admin “Tara” düğmesi → job oluştur → isteğe bağlı polling veya WebSocket (sonra).
- **Olay:** İleride `OutboxEvent` ile “job tamamlandı” yayımı; MVP’de job status yeterli.

### Deploy

- **MVP:** `apps/api` içinde modül; job işleyici aynı Node sürecinde.
- **Ölçek:** `apps/worker` aynı monorepo; aynı DB ve Prisma client; yalnız deploy birimi ayrılır.

---

## 3. Data Health — derin model

| Yapı | Açıklama |
|------|----------|
| **Profiling** | `ProfilingSnapshot`: `columnStats` JSON (null oranı, distinct, min/max özeti), `rowCount`, `capturedAt`. |
| **Quality rule** | `QualityRule`: varlık/kolon bağlı; `kind` (not_null, unique, range, regex, custom_sql); `config` JSON. |
| **Skor** | `QualityEvaluation`: `score` 0–1 veya 0–100 (ürün kararı); `dimensions` JSON ile kural bazlı parça skorlar. |

**Hesaplama (öneri):** Ağırlıklı ortalama veya “en kötü kural kazanır”; konfigürasyon `Plan` veya tenant ayarında tutulabilir — ilk sürümde sabit formül + dokümante.

---

## 4. Governance — sade ilk versiyon

**Şema evrimi (güncel):** Sahiplik / sınıflandırma / etiket / kritiklik alanları **`DataAsset`** üzerinde tutulur (ayrı `AssetGovernance` tablosu kaldırıldı; migration ile birleşti). Bkz. Prisma `schema.prisma`.

**Yok (bilinçli):** Serbest politika DSL’i, çok adımlı onay, workflow motoru, istisna merkezi — ürün sınırı [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md) ile uyumlu.

**İlişki:** `DataAsset` satırı; Health skoru tenant ekranlarında aynı varlık bağlamında gösterilir.

### 4.1 Phase 2 — kod durumu (Slice G1 → G3)

| Slice | Kapsam | Durum |
|--------|--------|--------|
| **G1** | Sahiplik, sınıflandırma, etiket, kritiklik; tenant API + Tenant App rotaları | **Uygulandı** |
| **G1.5** | Governance feedback (runtime; DB yok) | **Uygulandı** |
| **G2** | `GovernancePolicy` + `GovernanceViolation`; sabit `ruleType` seti; değerlendirme (patch / scan / re-evaluate); tenant + `data_governance` kapısı | **Uygulandı** |
| **G3** | İhlal için reason/fix/quickAction **ruleType’tan türetilir**; manuel resolve yok; alan düzelince otomatik `resolved`; liste/özet/asset detail API + Violations panel UX | **Uygulandı** |

**API (özet):** `GET/POST/PATCH /governance/policies`, `GET /governance/violations`, `GET /data-assets/:id/violations`, `GET /data-assets/:id` (uygun planda `violations` + `violationSummary`), `PATCH /data-assets/:id/governance`. **Yüzey:** yalnızca kiracı oturumu; Platform Console’da bu uçlar ürün olarak sunulmaz.

**Sonraki adaylar (ürün dili):** Phase 2 için isteğe bağlı polish (ör. tenant genelinde toplu re-eval). **Phase 3 — Data Lineage ürün kapsamı tamam** (L1–L3: kenar API, Tenant App lineage UI, downstream impact analizi); uygulama **`DataLineageEdge`** üzerinden. **Aktif faz: Phase 3.5 — Connector Expansion** (ilk bağlayıcı: MySQL) — [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md).

---

## 5. Lineage modeli

| Katman | Tasarım |
|--------|---------|
| **İlişkisel çekirdek** | `LineageNode` + `LineageEdge`; düğüm `kind`: asset, column, etl_job, external. |
| **Varlık bağlama** | `dataAssetId` / `dataColumnId` opsiyonel FK; ETL için `etlJobKey` (harici sistem id). |
| **Kenar** | `LineageEdgeKind`: derives_from, copies_to, feeds, aggregates_from; `metadata` JSON (pipeline adı, dbt node, vb.). |

**ETL hazırlığı:** `etlJobKey` + `metadata` kontratı; ileride harici orchestrator webhook’ları aynı tablolara yazar.

**Evrim:** Yoğun graf sorguları için read model (Neo4j, age) **projeksiyon** ile eklenir — operasyonel kayıt Postgres’te kalır.

**Phase 3 (tamamlandı) — uygulama notu:** Ürün omurgası **`DataLineageEdge`** (asset → asset, `LineageEdgeKind`) + API: `POST /lineage`, upstream/downstream, lineage-graph, **`GET /data-assets/:id/impact`** (L3: çok hop downstream etki, risk skoru, sayfalı liste). UI: governance **asset detail** içinde Lineage sekmesi (overview, graf, etki özeti). Örnek veri: seed’de Acme demo zinciri (`raw_orders` → … → `customer_summary`).

**Phase 3.5:** Yeni veritabanı bağlayıcıları (MySQL → MSSQL → Oracle); ayrıntı [`10-meta-003-project-tracker.md`](./10-meta-003-project-tracker.md) (C1–C4).

---

## 6. Veri modeli (Prisma) — özet

Eklenen ana tablolar (evrimle güncel): `Workspace`, `DataSource`, `DataSchema`, `DataAsset`, `DataColumn`, `QualityRule`, `ProfilingSnapshot`, `QualityEvaluation`, **`GovernancePolicy`**, **`GovernanceViolation`**, `LineageNode`, `LineageEdge`, `AgentJob`. (Tarihsel `AssetGovernance` → `DataAsset` alanlarına taşındı.)

**Mevcut platform:** `Tenant`, `User`, `Plan`, `Subscription` değişmedi; `Plan.featureTags` monetization için kullanılır.

---

## 7. Monetization bağlantısı

`Plan.featureTags` içinde sabit anahtarlar:

- `data_health`
- `data_governance`
- `data_lineage`

Kod: [`apps/api/src/lib/plan-features.ts`](../apps/api/src/lib/plan-features.ts) — `planHasFeature`, `assertPlanFeature`.

**Uygulama:** Abonelik çözüldükten sonra route handler’da tenant’ın planının tag’leri okunur; modül API’leri bu kapıdan geçer. Admin UI’da menü öğeleri aynı tag’lere göre gizlenir.

---

## 8. Sprint planı (güncel)

| Sprint | Kapsam | Çıktı |
|--------|--------|--------|
| **Sprint 1** | **Data Registry + Health MVP** | CRUD/registry; temel profiling snapshot; 1–2 kural tipi + skor; AgentJob ile metadata_scan + profiling yolu |
| **Sprint 2** | **Governance lite** | AssetGovernance UI + API; tag/classification/criticality |
| **Sprint 3** | **Agent** | Worker ayrımı (isteğe bağlı); quality_execution olgunlaştırma; job izleme |
| **Sprint 4** | **Lineage** | Node/edge oluşturma, basit graf görünümü, ETL anahtar alanları |

Platform sıkılaştırma (auth, webhook) önceki fazlarla paralel yürür.

---

## 9. Riskler (güncel)

| Risk | Açıklama | Azaltma |
|------|----------|---------|
| **Registry yoksa parçalanma** | Ürünler farklı “varlık” tanımları üretir | Sprint 1’de registry zorunlu |
| **Agent yoksa enterprise güçlü hikâye zor** | Manuel tarama sürdürülemez | Sprint 3’te iş güvenilirliği + gözlemlenebilirlik |
| **Lineage erken** | Graf maliyeti ve kapsam şişmesi | Sprint 4’e sabitleme; önce sütun/tablo düzeyi dar MVP |
| **Şema genişlemesi** | Migration + test yükü | Modüler monolit; tek migration seti; feature flag ile kademeli UI |

---

## Çıktı özeti

| # | Teslim |
|---|--------|
| 1 | **Güncellenmiş mimari:** Registry merkezli üç ürün + Agent iş hattı + modüler monolit |
| 2 | **Veri modeli:** Prisma’da uygulandı (bkz. şema + migration) |
| 3 | **Agent tasarımı:** `AgentJob` + üç tip; worker’a evrilebilir |
| 4 | **Roadmap:** S1 Registry+Health → S2 Gov lite → S3 Agent → S4 Lineage |
| 5 | **Net öneri:** **Sprint 1’e odaklan** — registry + health MVP; governance ve lineage bu zeminde hızlı büyür |

---

*Şema değişiklikleri için `cd apps/api && npx prisma migrate deploy` (veya geliştirmede `migrate dev`). Seed planları `41-ref-001-dev-seed-users.md` ile uyumlu tutulmalıdır.*
