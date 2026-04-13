# Faz 1 minimum — Prisma yüzeyi, tenant-scope API, PostgreSQL scan pipeline

**Amaç:** Data Health Faz 1 için **minimum taşınabilir paket**: Prisma modelleri, tenant + `data_health` kuralları, **gerçek scan akışı** (`POST /data-sources/:id/scan`) ve sonraki sıkılaştırma adımları.

## Ürün yüzeyi ve Data Health konumu

| Gerçek | Açıklama |
|--------|----------|
| **İki yüzey** | **`admin-web`** tek kabuktur; **Platform Console** (`/platform/*`) ve **Tenant App** (`/app/*`) ayrı rotalar ve menülerle çalışır — bkz. [`10-meta-002-project-overview.md`](./10-meta-002-project-overview.md). |
| **Data Health = tenant ürünü** | Birincil UX **`/app/data-health`**; scan, profiling ve skor **kiracı bağlamında** (tenant session + `data_health` planı). |
| **Platform Console** | Global SaaS operasyonu (workspaces, planlar, abonelikler); **Data Health’in ürün yüzeyi değildir**. API’de platform admin, destek amaçlı `tenantId` ile bazı registry uçlarını çağırabilir; **scan ürün akışı tenant oturumuna aittir** (platform admin `/app/*` ile tenant ekranına yönlendirilmez — impersonation yok). |

**Kaynak kod:** `apps/api/prisma/schema.prisma`, `apps/api/src/routes/data-registry.ts`, `apps/api/src/routes/data-health.ts`, `apps/api/src/lib/scan/scan-orchestrator.ts`, `apps/api/src/lib/connectors/postgres-metadata.ts`, `apps/api/src/lib/connectors/postgres-ping.ts`, `apps/api/src/lib/data-health-gates.ts`, `apps/api/src/lib/plan-features.ts`, `apps/api/src/lib/tenant-plan-features.ts`, `apps/admin-web` — tenant **Veri sağlığı** (`/app/data-health`), `apps/admin-web/src/lib/access.ts`, `navigation/nav-config.tsx`.

**İlgili kurallar:** [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md), [`10-plan-006-data-platform-registry-agents-spec.md`](./10-plan-006-data-platform-registry-agents-spec.md).

---

## 1. Faz 1 minimum Prisma “diff” (kavramsal)

Repoda tek migration seti vardır; aşağıdaki tablolar **ürün anlamında** Faz 1 Data Health minimumunu tanımlar. **Scan pipeline** ile `DataSchema` / `DataAsset` / `DataColumn` upsert, `ProfilingSnapshot` ve `QualityEvaluation` append, `QualityRule` değerlendirmesi (v1: ağırlıklı `not_null`; diğer kind’ler *skipped*) üretimde kullanılır. (Governance / Lineage ağır API’leri bilinçli olarak sonraya bırakılır.)

### 1.1 Zorunlu çekirdek (platform + monetization)

| Model | Rol |
|--------|-----|
| `Tenant` | Çok kiracılı sınır |
| `User` | Oturum ve üyelik |
| `Plan` | `featureTags` içinde `data_health` |
| `Subscription` | Kiracı ↔ plan; `active` / `trialing` ile özellik çözümü |

### 1.2 Data Registry (Faz 1 hedef veri modeli)

| Model | Rol |
|--------|-----|
| `Workspace` | İsteğe bağlı; `DataSource.workspaceId` |
| `DataSource` | `tenantId`, `kind` (Faz 1 API: yalnızca `postgres`), `connectionSecretRef` (ham secret yok) |
| `DataSchema` | PG şema adı (`public`, …); metadata taraması sonrası dolar |
| `DataAsset` | Tablo/view kaydı |
| `DataColumn` | Kolon metadata |

### 1.3 Data Health (Faz 1 tamamlayıcı — API sırayla)

| Model | Rol |
|--------|-----|
| `ProfilingSnapshot` | `columnStats` JSON, `rowCount`, `capturedAt` |
| `QualityRule` | `kind` + `config` JSON |
| `QualityEvaluation` | `score`, `dimensions` JSON |

### 1.4 Şemada var, Faz 1 minimum API dışı (bilinçli)

| Model | Not |
|--------|-----|
| `AssetGovernance`, `LineageNode`, `LineageEdge` | Sonraki fazlar / [`rules-001`](./20-rules-001-product-scope.md) |
| `AgentJob` | **Kullanımda:** her `POST .../scan` için `type: metadata_scan`, `running` → `succeeded` / `failed`; `result` / `error` (hata metni redakte); async worker yok — senkron iş ≤15s |

### 1.5 Gerçek migration referansı

Registry + health + governance + lineage + agent tek blokta özetlenen SQL:  
`apps/api/prisma/migrations/20260412055838_data_registry_health_governance_lineage_agents/migration.sql`

Yeni kurulumda **ek Prisma diff üretmeden** `migrate deploy` yeterlidir; Faz 1 “minimum” yalnızca **hangi tabloların ürün diliminde kullanılacağını** seçer.

---

## 2. Tenant-scope API (mevcut uygulama)

**Kimlik:** `Authorization: Bearer` veya HttpOnly `royalty_session` (`apps/api/src/lib/http-auth.ts`).

**Özellik kapısı:** `Plan.featureTags` içinde `data_health` — `getTenantPlanFeatureTags(tenantId)` + `planHasFeature` (`apps/api/src/lib/tenant-plan-features.ts`, `plan-features.ts`).

### 2.1 Data Registry — DataSource (Slice 1)

| Metot | Yol | Tenant kuralları | `data_health` |
|--------|-----|------------------|----------------|
| GET | `/data-sources` | Kiracı kullanıcı: yalnızca kendi `tenantId`. Platform yöneticisi: tümü veya `?tenantId=` ile filtre. | Kiracıda okuma için gerekli; platform yöneticisi listede muaf. |
| GET | `/data-sources/:id` | `canAccessTenant`; kiracıda okuma için özellik gerekli. | Aynı |
| POST | `/data-sources` | Gövde `tenantId` platform yöneticisi için zorunlu; kiracı kullanıcı kendi kiracısı. | Yazma: hedef kiracıda zorunlu. |
| PATCH | `/data-sources/:id` | Kayıt `tenantId` erişim + yazma kapısı. | Zorunlu |
| DELETE | `/data-sources/:id` | Aynı | Zorunlu |
| POST | `/data-sources/:id/test-connection` | Aynı erişim; gövde `connectionUrl` (geliştirme; üretimde kısıt). | Zorunlu |
| POST | `/data-sources/:id/scan` | `public` şeması; deterministik tablo sırası; **≤20 tablo**; **≤15s** toplam deadline; metadata + upsert + örneklem profili + kalite skoru; bağlantı: **geliştirmede** isteğe bağlı `connectionUrl` gövdesi, **üretimde** yalnızca `DataSource.connectionSecretRef` + sunucu `ROYALTY_DATASOURCE_SECRETS_JSON` (bkz. `connection-env.ts`). | Zorunlu (`gateWrite`) |

**Faz 1 iş kuralı (oluşturma):** `kind` yalnızca **`postgres`** — diğer `DataSourceKind` scan’de **400** `only_postgres`.

**Scan pipeline (uygulama):** `apps/api/src/lib/scan/scan-orchestrator.ts`, `apps/api/src/lib/connectors/postgres-metadata.ts` (`listTables`, `getColumns`, `profile`), `apps/api/src/lib/scan/evaluate-and-score.ts`, `apps/api/src/lib/scan/sanitize-error.ts`.

**Yanıt özeti (200):** `processedAssetCount`, `createdAssetCount`, `updatedAssetCount`, `score` (varlık skorlarının **aritmetik ortalaması**), `scoreAggregation: "mean_per_asset"`, `durationMs`, `jobId`, isteğe bağlı `stoppedEarly`. İstemci hata (502): genel mesaj; teknik ayrıntı sızdırılmaz.

### 2.2 Data Health — Slice 2 (registry genişlemesi + profil/kalite/skor)

**Dosya:** `apps/api/src/routes/data-health.ts` (ortak kapılar: `apps/api/src/lib/data-health-gates.ts`).

| Metot | Yol | Not |
|--------|-----|-----|
| GET | `/data-sources/:dataSourceId/data-assets` | Varlık listesi (+ `_count` özetleri) |
| GET | `/data-assets/:id` | Varlık + kolonlar + kaynak özeti |
| POST | `/data-assets` | Yeni varlık (`kind` table/view; kaynak `postgres`) |
| GET/POST | `/data-assets/:assetId/profiling-snapshots` | Profil anlık görüntüsü |
| GET/POST/PATCH/DELETE | `/data-assets/.../quality-rules`, `/quality-rules/:id` | Kalite kuralları |
| GET/POST | `/data-assets/:assetId/quality-evaluations` | Skor satırları (`score` 0–100) |

**Tenant app UI:** `apps/admin-web` — **`/app/data-health`** (tenant kullanıcı); scan butonu, loading, sonuç özeti, i18n; menü `data_health` + tenant yüzeyi kurallarına uygun. (Platform konsolu birincil scan ürünü değildir.)

### 2.3 Scan observability — Slice 4 (tamamlandı)

**Slice 4 tamamdır:** Tenant App’te tarama **geçmişi / zaman çizelgesi** görünürlüğü; okuma ucu `data-registry` içinde **`GET /data-sources/:id/scan-history`** (`AgentJob` `metadata_scan`, `createdAt` azalan, son 10); UI’da yükleme / boş / hata durumları (`apps/admin-web/src/components/data-health/ScanHistorySection.tsx`, `DataHealthPage`).

| Metot | Yol | Not |
|--------|-----|-----|
| GET | `/data-sources/:id/scan-history` | Kiracı: `gateRead` + `data_health`; yanıt öğesi: `id`, `createdAt`, `score`, `status` (`success` \| `error` \| `running`), `durationMs`, `processedAssetCount` |

**Smoke (manuel):** `data_health` aboneliği olan tenant kullanıcısı ile **`/app/data-health`** → **veri kaynağı seç** → (yerelde gerekiyorsa **PostgreSQL URL** gir) → **Şimdi tara** → **Tarama geçmişi** bölümünde listenin üstünde **yeni satır** (göreli zaman, skor, işlenen varlık, süre, durum rozeti).

### 2.4 Sonraki dilimler

- **Kimlik:** `connectionSecretRef` → vault/secret çözümü; gövde `connectionUrl` üretimde kapalı
- **Kurallar:** `range` / `regex` / … için evaluator genişletmesi (şu an *skipped* kaydı)
- Governance / Lineage API’leri (faz planına göre)
- İsteğe bağlı: uzun taramalar için async kuyruk + `GET /agent-jobs/:id`

---

## 3. PostgreSQL connector

### 3.1 Bağlantı testi (Slice 1)

**Dosya:** `apps/api/src/lib/connectors/postgres-ping.ts`

- **Girdi:** `connectionString` (tek seferlik).
- **Davranış:** `pg.Client` ile bağlan, `SELECT version()`, satırı döndür veya hata mesajı.
- **Güvenlik:** Üretimde gövdede `connectionUrl` **kabul edilmez**; vault-lite: `ROYALTY_DATASOURCE_SECRETS_JSON` + `connectionSecretRef`.

### 3.2 Metadata + profil (scan — **tamam**)

**Dosya:** `apps/api/src/lib/connectors/postgres-metadata.ts`

- **`listTables(client, schemaName, limit, deadline)`** — yalnızca `public`; `pg_catalog`, `ORDER BY` ile deterministik; `LIMIT 20`.
- **`getColumns(client, schemaName, tableName, deadline)`** — `information_schema.columns`.
- **`profile(client, schemaName, tableName, columnNames, deadline)`** — `LIMIT` örneklem; null oranı; yaklaşık `reltuples` satır sayısı; `columnStats` içinde `nullFraction`, `sampleSize`, `nullCountApprox`.

### 3.3 Sonraki sıkılaştırma

| Adım | İçerik |
|------|--------|
| **Kimlik** | `connectionSecretRef` → vault; scan/test-connection gövdesinde URL yok |
| **Hata / SSL** | Salt okunur rol, SSL modu, daha sıkı timeout politikası |

### 3.4 Faz 1 dışı connector’lar

`DataSourceKind` içinde `mysql`, `snowflake`, … enum değerleri vardır; **Faz 1** ürün kuralı gereği API yalnızca PostgreSQL oluşturmayı ve scan’i kabul eder.

---

## 4. Faz 1 — tamamlananlar ve bilinçli eksikler

**Tamamlananlar:** registry + upsert; scan (PG `public`, limitler); ProfilingSnapshot / QualityEvaluation append; kural değerlendirme (v1 `not_null` + diğer kind *skipped*); tenant Data Health UI; platform/tenant route ayrımı; **Slice 4** scan history API + timeline UI (bkz. §2.3).

**Bilinçli eksik / sonraki:** vault + `connectionSecretRef`; async kuyruk (opsiyonel); ek kural tipleri ve skor iyileştirmesi; multi-db; lineage/governance ağır modüller.

---

## 5. Kalan riskler (kısa)

| Risk | Not |
|------|-----|
| Gövde `connectionUrl` | Üretimde flag olmadan kapalı; sıradaki iş vault/ref |
| 15s senkron limit | Büyük şemalarda kısmi sonuç veya hata |
| İstemci 502 mesajı | Genel metin; ayrıntı DB job kaydında (redakte) |
| Çoklu motor | Faz 1 dışı — [`rules-001`](./20-rules-001-product-scope.md) |
| İki yüzey karışıklığı | Dokümanlarda Data Health **yalnızca Tenant App** olarak anılmalı |

---

## 6. Tek cümlelik özet

**Faz 1 minimum** Tenant + Plan/Subscription + Data Registry + Health tabloları; **tenant-scope + `data_health`** ile **`POST /data-sources/:id/scan`** gerçek PG (`public`) metadata, upsert, örneklem profili, kural/skor ve **`AgentJob`** kaydı üretir; **PostgreSQL** için `postgres-ping` + `postgres-metadata`; **sıradaki kritik iş** hedef DB kimliğini **vault + `connectionSecretRef`** ile bağlamak ve üretimde gövde URL’sini kaldırmak.
