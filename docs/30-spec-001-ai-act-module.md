# AI Act Compliance module (spec)

**Amaç:** Tenant bazlı AI Act uyum sürecini standartlaştırmak; AI sistem envanteri, risk değerlendirmesi, uyum görevleri ve raporlamayı tek module altında yönetmek.

**Konum:** `ai_act`, platformdaki **first non-loyalty module** olarak konumlanır; ana kullanım amacı **B2B compliance** süreçleridir.

---

## Module hedefi

`ai_act` module aşağıdaki iş sonuçlarını üretir:

1. **AI system inventory:** Tenant içindeki AI sistemlerinin kayıt altına alınması
2. **Risk assessment:** Sistem bazlı risk seviyesinin değerlendirilmesi
3. **Compliance tasks:** Eksik kontroller için görev üretimi ve takibi
4. **Reports:** Denetim ve iç kontrol için uyum raporlarının dışa aktarımı

---

## Kapsam varlıkları (entities)

| Entity | Sorumluluk |
|--------|-------------|
| **AiSystem** | AI sistem temel kaydı (amaç, kullanım alanı, sahiplik bağlamı) |
| **RiskAssessment** | Soru seti ve değerlendirme çıktısı |
| **ComplianceTask** | Uyum eksiği için aksiyon/görev kaydı |
| **ComplianceReport** | Değerlendirme + görev durumundan üretilen rapor |

**Kural:** Bu varlıklar tenant-scoped çalışır; tenant dışı görünürlük yoktur.

---

## Çekirdek akış (core flow)

1. **Create AI system:** Kullanıcı tenant içinde yeni `AiSystem` kaydı oluşturur.
2. **Run questionnaire:** Sistem için değerlendirme soru seti tamamlanır.
3. **Calculate risk:** Yanıtlara göre risk seviyesi hesaplanır ve `RiskAssessment` kaydı oluşur.
4. **Generate tasks:** Risk ve eksik kontrollerden `ComplianceTask` kayıtları üretilir.
5. **Export report:** Süreç çıktısı `ComplianceReport` olarak dışa aktarılır.

---

## RBAC

| Role | Yetki düzeyi |
|-----|---------------|
| **ADMIN** | Module üzerinde tam erişim (oluşturma, güncelleme, görev yönetimi, rapor/export) |
| **MEMBER** | Sınırlı erişim (görüntüleme + tenant politikasına göre kısmi işlem) |
| **ADVISOR** | Yalnızca ilgili tenant membership’i varsa erişim |

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
