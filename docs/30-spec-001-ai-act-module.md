# AI Act Compliance module (spec)

**Amaç:** Tenant bazlı AI Act uyum sürecini standartlaştırmak; AI sistem envanteri, risk değerlendirmesi, uyum görevleri ve raporlamayı tek module altında yönetmek.

**Konum:** `ai_act`, platformun **compliance-capable SaaS** yönünü taşıyan stratejik module'dür; ana kullanım amacı **B2B compliance**, governance ve advisor workflow'larıdır.

**Paylaşılan AI katmanı bağımlılığı:** `ai_act` module, ortak AI Document Intelligence altyapısını tüketir; doküman sınıflandırma, extraction, embedding ve tenant-scoped retrieval bu paylaşılan katman üzerinden sağlanır.

---

## Module hedefi

`ai_act` module aşağıdaki iş sonuçlarını üretir:

1. **AI system inventory:** Tenant içindeki AI sistemlerinin kayıt altına alınması
2. **Risk assessment:** Sistem bazlı risk seviyesinin değerlendirilmesi
3. **Compliance tasks:** Eksik kontroller için görev üretimi ve takibi
4. **Review-ready output:** Değerlendirme ve görev çıktılarının operasyonel kullanıma hazır sunulması

---

## Kapsam varlıkları (entities)

| Entity | Sorumluluk |
|--------|-------------|
| **AiSystem** | Tenant-scoped AI sistem temel kaydı (provider, status, sahiplik bağlamı) |
| **AiAssessment** | Sistem bazlı değerlendirme (version, classificationSource, confidence, riskLevel) |
| **AiAssessmentAnswer** | Soru bazlı yanıt verisi (derived answer + confidence) |
| **AiObligation** | Uyum gereksinimi kaydı (rule/AI/manual kaynaklı) |
| **AiTask** | Uyum görevi ve iş takibi (priority/status/assignee) |
| **AiEvidence** | Kanıt kaydı (document/link/note) |
| **AiDocumentLink** | Sistem ile ilişkili doküman bağlantısı (contract/policy vb.) |
| **AiRiskResult** | Derived risk çıktısı (authoritative olmayan değerlendirme sonucu) |

**Kural:** Bu varlıklar tenant-scoped çalışır; tenant dışı görünürlük yoktur.
**Source of truth kuralı:** Uploaded document source of truth olarak kalır; AI extraction/risk sonuçları derived data'dır.

---

## Çekirdek akış (core flow)

1. **Create AI system:** Kullanıcı tenant içinde yeni `AiSystem` kaydı oluşturur.
2. **Run questionnaire:** Sistem için değerlendirme soru seti tamamlanır.
3. **Calculate risk:** Yanıtlara göre risk seviyesi hesaplanır ve `AiRiskResult` kaydı oluşur.
4. **Store evidence:** OCR sonucu ve embedding referansı `AiDocument` ile tenant scope içinde saklanır.
5. **Review-ready output:** Sonuçlar tenant bazlı assessment/obligation/task endpoint'leri üzerinden erişilir.

---

## MVP API surface (onboarding)

Onboarding akışı:

AI system inventory
→ 10-question assessment
→ deterministic risk suggestion
→ obligations/tasks
→ review-ready output

Endpoint'ler (`/ai-act`):

- `GET /ai-act/systems`
- `POST /ai-act/systems`
- `GET /ai-act/systems/:id`
- `POST /ai-act/systems/:id/assessment`
- `GET /ai-act/systems/:id/assessment`
- `GET /ai-act/systems/:id/obligations`
- `GET /ai-act/systems/:id/tasks`

Güvenlik:

- Tenant isolation zorunlu (`tenantId` filtreleme)
- membership-based access zorunlu
- module activation (`ai_act`) zorunlu
- AI output suggestion'dır; legal conclusion değildir
- `ai_act.export` izni bu MVP fazında yalnızca reserve edilir; export endpoint'i henüz yoktur.

## AI Compliance Operations Endpoint (Step 13 - Authoritative)

**Endpoint:** `GET /admin/products/ai-compliance/operations`

**Durum:** Artık **birincil (authoritative)** veri kaynağı. `/admin/bootstrap` `moduleOperations.aiCompliance` artık sadece sayaç alanları döndürür, sistem listesi tamamen kaldırıldı (Step 14 ile).

**Amaç:**
- `/admin/bootstrap` yükünü azaltmak
- AI Compliance operasyonel verisini ürün-özel endpoint'te toplamak
- Platform admin için cross-organization görünürlük sağlamak
- Loyalty-only tenant'ların AI Compliance verisine erişimini engellemek

**Scope davranışı:**
1. **Platform admin/operator:** Tüm ai_act-aktif tenant'ların cross-organization operasyonel verisi
2. **Tenant user:** Yalnızca kendi erişilebilir tenant scope'u (ai_act aktif ve ai_act.view izni gerekli)
3. **Loyalty-only / cafe-only tenant:** Boş/zero veri (ai_act modülü olmadan erişilemez)
4. **Unauthenticated:** `401 unauthorized`

**Erişim kontrolleri:**
- Kimlik doğrulama (authenticated user)
- Membership-first tenant access (tenant kullanıcıları için)
- `ai_act.view` izin kontrolü
- `ai_act` modül aktivasyonu kontrolü

**Hata yanıtları (flat format):**
- `401 unauthorized` — Geçerli oturum yok
- `403 tenant_context_required` — Tenant bağlamı eksik (normal kullanıcılar için)
- `403 permission_denied` — `ai_act.view` izni yok
- `403 module_not_active` — `ai_act` modülü aktif değil

**Yanıt yapısı:**
```json
{
  "aiCompliance": {
    "activeOrganizations": number,
    "assessmentsCompleted": number,
    "pendingReviews": number,
    "openObligations": number,
    "systemsNeedingReview": number,
    "overdueObligations": number,
    "escalatedAssessments": number,
    "advisorWorkload": number,
    "evidenceBacklog": number,
    "systems": [...]  // AI sistem listesi detayları
  }
}
```

**Backend read model:**
Tek kaynak: `loadAiComplianceOperationsForScope({ mode: "tenant" | "cross_org" | "platform_admin" })` — `apps/api/src/lib/ai-compliance-operations.ts`

**Frontend kullanımı:**
```typescript
const { token, refreshKey } = useAuth();
const { data, loading, error } = useAiComplianceOperations(token, refreshKey);
```

**Migration durumu (Step 13 + 14 ile tamamlandı):**
- `/admin/bootstrap` `moduleOperations.aiCompliance.systems` → **KALDIRILDI** (artık mevcut değil)
- `/admin/bootstrap` sayaçlar → **KALDI** (sadece sayısal metrikler)
- Birincil endpoint: `GET /admin/products/ai-compliance/operations`
- Frontend: Tüm AI Compliance yüzeyleri yeni hook'u kullanıyor
- Bootstrap contract hardened: TypeScript gelecekteki regressions'ları yakalar
- Bootstrap contract testi eklendi: regressions'ları önler

## Operational realism layer (Step 8)

AI Compliance platform yüzeyleri, geniş backend rewrite veya workflow engine eklemeden operasyonel görünürlüğü artırır:

- **Today's Action Queue:** overdue obligations, escalated assessments, stale/critical evidence, blocked reviews, advisor waiting items ve high-priority AI systems mevcut bootstrap/moduleOperations kayıtlarından türetilir.
- **Provenance-aware timeline:** event satırları actor, source, timestamp, related object, severity ve event reason gösterir.
- **Derived signal ayrımı:** Persisted audit/event kaydı olmayan satırlar `Derived signal` olarak etiketlenir; gerçek audit provenance ima edilmez.
- **SLA/aging presentation:** On track, Due soon, Overdue, Blocked ve Stale evidence durumları command center, systems registry, system detail ve Organization Detail AI Compliance özetinde gösterilir.
- **Boundary:** Bu yüzeyler yalnızca `ai_act` module aktivasyonu ve mevcut platform/admin erişim bağlamı içinde görünür; loyalty-only organizasyonlara AI Compliance widget'ı sızdırılmaz.

## Workflow realism layer (Step 9)

AI Compliance operasyon yüzeyleri, backend workflow persistence eklemeden daha aksiyon alınabilir ve açıklanabilir hale getirilir:

- **Readable operational time:** Timeline, registry, system detail ve Organization Detail AI Compliance özetlerinde ham ISO timestamp yerine `Today 05:21 UTC`, `Apr 29, 05:21 UTC`, `0 days since update` veya `14 days overdue` gibi okunabilir zaman ifadeleri kullanılır.
- **Priority explainability:** Priority score tek başına gösterilmez; risk sonucu, açık obligation sayısı, review durumu ve evidence yaşı gibi mevcut kayıtlardan gelen nedenlerle birlikte sunulur.
- **Action queue actionability:** Today's Action Queue satırları category, primary action, secondary context, target route ve yalnızca navigational `Open` / `Review` aksiyonu gösterir; fake mutation veya resolve davranışı ima edilmez.
- **Controlled operational friction:** Unassigned owner, Awaiting advisor, Evidence missing, Review overdue, Vendor documentation missing ve Open obligations require owner sinyalleri yalnızca mevcut kayıtlardan türetilir.
- **Timeline clarity:** Timeline satırları actor, source, related object, reason, readable timestamp ve `Derived signal` / record-backed ayrımını korur.
- **Persistence boundary:** Bu adım gerçek audit event, workflow engine, notification veya persisted state eklemez; kalıcı provenance gereksinimi ayrı backend fazı olarak kalır.

Questionnaire keys (v1, 10 soru):

Bu key seti için tek kaynak `apps/api/src/lib/ai-act-assessment.ts` dosyasındaki `AI_ACT_QUESTION_KEYS` tanımıdır; legacy key setleri kullanılmaz.

- `q_ai_used`
- `q_ai_purpose`
- `q_personal_data`
- `q_sensitive_data`
- `q_automated_decision`
- `q_human_oversight`
- `q_employment_context`
- `q_biometric_identification`
- `q_safety_critical`
- `q_provider_documentation`

Deterministic MVP risk rules (özet):

`q_ai_purpose` değeri `customer_support`, `employee_performance`, `other` enum seti ile sınırlandırılır.

- biometric_identification = yes → `HIGH`
- employment_context = yes + automated_decision = yes → `HIGH`
- safety_critical = yes → `HIGH`
- sensitive_data = yes + automated_decision = yes → `HIGH`
- ai_used = no → `MINIMAL`
- diğer durumlar → `LIMITED`

Assessment lifecycle notu:

- AI assessments versioned tutulur.
- Her `AiSystem` için yalnızca bir adet `current` assessment bulunur.

## Seed senaryoları (MVP)

- AI Act seed verisi sentetik demo senaryoları içerir; gerçek kişi/veri kullanılmaz.
- Örnek sistemler: `Customer Support Chatbot` (LIMITED) ve `Employee Performance Scoring` (HIGH).
- Senaryolarda 10 soru answer seti, confidence, obligation/task ve evidence bağlantıları bulunur.
- Low-confidence + human review gerektiren örnekler özellikle seed edilir.
- Tüm kayıtlar tenant-scoped üretilir; erişim modeli membership-first doktrine bağlıdır.

---

## RBAC

| Role | Yetki düzeyi |
|-----|---------------|
| **ADMIN / owner** | `ai_act.view`, `ai_act.manage`, `ai_act.assess`, `ai_act.export` |
| **MEMBER / manager** | `ai_act.view`, `ai_act.assess` |
| **ADVISOR** | `ai_act.view`, `ai_act.assess` (yalnızca membership olan tenant kapsamında) |
| **viewer** | `ai_act.view` |

**Kural:** Advisor erişimi role adına göre değil, membership varlığı + izin kontrolü ile verilir.

---

## Entegrasyon kuralları

1. Module, core `tenant` ve `user` bağlamını kullanır; ayrı kimlik/tenant modeli oluşturmaz.
2. Erişim kontrolü core membership mekanizması üzerinden yapılır.
3. Rapor ve export çıktıları mevcut compliance export güvenlik kurallarına uyar.
4. Module, cross-tenant erişim güvenlik kurallarını istisnasız uygular.

---

## Gelecek genişletme

- **Automation:** Risk değişimine bağlı otomatik görev açma/yenileme
- **Continuous monitoring:** Periyodik yeniden değerlendirme ve sürekli uyum izleme

Bu genişletmeler, tenant izolasyonu ve membership tabanlı erişim ilkelerini değiştirmez.

---

## İlgili dokümanlar

- Module mimarisi: [`20-rules-013-platform-modules.md`](./20-rules-013-platform-modules.md)
- Advisor–client modeli: [`20-rules-014-advisor-client-model.md`](./20-rules-014-advisor-client-model.md)
- Cross-tenant güvenlik: [`20-rules-015-cross-tenant-access-security.md`](./20-rules-015-cross-tenant-access-security.md)
- Genel güvenlik kuralları: [`20-rules-005-security.md`](./20-rules-005-security.md)
- AI guardrails (risk/security): [`20-rules-019-ai-document-intelligence-risk.md`](./20-rules-019-ai-document-intelligence-risk.md)
- Platform AI infrastructure spec: [`30-spec-003-ai-document-intelligence-infrastructure.md`](./30-spec-003-ai-document-intelligence-infrastructure.md)
