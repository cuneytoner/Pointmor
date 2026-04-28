# Pointmor Platform Proje Planı

## 1. Ürün Vizyonu

Pointmor modüler çok kiracılı bir platformdur.  
Platform çekirdeği tenant, membership, auth/session, güvenlik ve module activation katmanını sağlar; alan işlevleri module yapılarıyla sunulur.

- Cafe/loyalty alanı platform içinde **mevcut module (`cafe`)** olarak konumlanır.
- AI Act Compliance module, platformdaki **ilk loyalty dışı module** olarak konumlanır.
- Advisor/client modeli, platformun B2B dağıtım ve operasyon ölçekleme katmanı olarak stratejiktir.

---

## 2. Tamamlananlar

- Dokümantasyon konsolidasyonu ve tek giriş yaklaşımı (`00-overview` merkezli) tamamlandı.
- Çekirdek platform doktrini (tenant + membership + module + isolation) netleştirildi.
- Membership üzerinden erişim modeli netleştirildi.
- Module sistemi tasarımı ve tenant module activation yapısı tanımlandı.
- Advisor-client model kuralları netleştirildi.
- Cross-tenant security kuralları sıkılaştırıldı.
- Schema constraints (DB enforcement) dokümantasyonu tamamlandı.
- Enforcement contract (API/service/DB katmanları) tanımlandı.
- RBAC referansları tek dosyada konsolide edildi.
- Seed/demo/reference dokümanları sadeleştirildi ve tekrarlar azaltıldı.

---

## 3. Current Phase: Phase 7 - Pilot & Real-World Validation

Bu planın güncel odagi, teslim edilmis temel teknik kabiliyetler uzerinde gercek dunya dogrulamasidir.

**Aktif odak:** pilot onboarding, canli kullanim olcumu, geri bildirim dongusu ve GTM hazirligi.

---

## 4. Completed Foundations (Locked)

- **Invitation Security Hardening - DONE**
  - Invitation acceptance akisi token + email eslesmesi ve guvenli membership olusumu ile sertlestirildi.
- **Membership-First Access Enforcement - DONE**
  - Erisim kararlari `TenantMembership` uzerinden zorunlu kilindi; legacy tenant baglantilari access source-of-truth olarak kullanilmiyor.
- **Module Activation Enforcement - DONE**
  - Module kapali oldugunda ilgili API/UI yuzeylerine erisim engellenir; deny-by-default ve tenant scope enforce edilir.
- **AI Act MVP Backend - DONE**
  - `system inventory -> assessment -> risk suggestion -> obligations/tasks` akisi tenant-scoped, membership-based ve module-gated olarak teslim edildi.
  - Versioned assessment ve sistem basina tek `current` kurali uygulanir.
- **AI Act MVP UI (end-to-end flow) - DONE**
  - AI system listesi, yeni sistem olusturma, assessment, risk sonucu, obligations/tasks yuzeyleri calisir durumda ve backend kontratiyla hizalidir.
- **Multi-product seed structure (platform demo baseline) - DONE**
  - Seed tenant seti AI Act focused, Loyalty focused, Mixed ve Advisor senaryolarini module activation + membership-first doctrine ile temsil eder.

---

## 5. Delivered Phases and Forward Plan

## Phase 3.5 - AI Document Intelligence Infrastructure

Purpose:
Create a shared platform AI layer that can:
- classify uploaded documents
- extract structured fields
- support OCR/VLM processing
- support tenant-scoped retrieval
- suggest actions for modules such as AI Act, expense capture, contract review, and e-invoice

### Goal

Build a low-cost, self-hostable AI document pipeline that goes beyond classic OCR.

### Why this exists

- classic OCR only extracts text
- platform needs document understanding
- AI Act needs contract/policy/system-document interpretation
- future expense capture needs amount/vendor/date extraction

### Architecture

upload
→ file validation
→ document classification
→ OCR / VLM extraction
→ schema validation
→ human review
→ tenant-scoped storage
→ action generation
→ module output

### Proposed stack

- OCR/parser: PaddleOCR or Tesseract as fallback
- VLM/LLM: Ollama-compatible local models or external worker
- embeddings: sentence-transformers or equivalent
- vector DB: Qdrant
- queue: Redis/job worker
- storage: object storage
- metadata/results: PostgreSQL

### MVP scope

- no custom model training
- prompt/schema extraction
- validation rules
- human review
- audit trail
- tenant isolation

### Not now

- no fine-tuning
- no fully autonomous decisions
- no cross-tenant learning
- no production GPU dependency in MVP

### Success criteria

- document type classification works
- extracted fields are saved with confidence
- low-confidence results go to review
- all AI artifacts are tenant-scoped
- AI Act MVP can consume extracted document insights

### Definition of Done

- architecture documented
- risks documented
- requirements documented
- AI data storage model defined
- human review requirement defined
- tenant isolation rules defined

### İlgili dokümanlar

- Risk / security guardrails: [`20-rules-019-ai-document-intelligence-risk.md`](./20-rules-019-ai-document-intelligence-risk.md)
- Platform AI infrastructure spec: [`30-spec-003-ai-document-intelligence-infrastructure.md`](./30-spec-003-ai-document-intelligence-infrastructure.md)

## Phase 4 - AI Act MVP (Delivered)

- **Durum:** Ilk loyalty disi module MVP'i teslim edildi.
- **Kod değişiklikleri:** `AiSystem`, `AiAssessment`, `AiAssessmentAnswer`, `AiObligation`, `AiTask`, `AiEvidence`, `AiDocumentLink` tenant-scoped veri modeli; değerlendirme/risk akışı için derived-data kurgusu.
- **Enforcement gereksinimleri:** Tenant izolasyonu, membership tabanlı erişim, module activation gate.
- **Dokümantasyon güncellemeleri:** AI Act spec dosyasını endpoint/model ve akış detaylarıyla güncellemek; paylaşılan AI infrastructure spec ve AI risk guardrail dokümanlarıyla birlikte tutmak.
- **Başarı kriterleri:** 10 soruluk assessment akışı tamamlanır; risk sınıfı ve temel rapor üretimi çalışır.
- **RBAC kararı:** `ai_act.manage` yalnızca owner/admin; member/manager ve advisor için kapsam `ai_act.view` + `ai_act.assess`.
- **API kapsam notu:** `GET /ai-act/systems/:id/obligations` MVP kapsamındadır; `ai_act.export` reserve edilir, export endpoint'i bu fazda uygulanmaz.

## Phase 5 - Advisor Dashboard

- **Hedef:** Advisor kullanıcıların çoklu client tenant operasyonunu tek yüzeyden yönetebilmesi.
- **Kod değişiklikleri:** Advisor odaklı tenant listesi, durum/aksiyon ekranları, membership tabanlı görünürlük.
- **Enforcement gereksinimleri:** Cross-tenant açık membership zorunluluğu; external advisor yetki sınırları.
- **Dokümantasyon güncellemeleri:** Advisor-client modeli ve security dokümanında gösterge paneli davranış kurallarını netleştirmek.
- **Başarı kriterleri:** Advisor, yalnızca üyeliği olan tenant'ları görür ve yönetir; privilege escalation oluşmaz.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Phase 6 - Productization + Billing

- **Hedef:** Plan/entitlement ve fiyatlandırma akışlarını ürünleşme seviyesine taşımak.
- **Kod değişiklikleri:** Plan feature gating olgunlaştırması, abonelik yaşam döngüsü, billing yüzeyi entegrasyonu.
- **Enforcement gereksinimleri:** Feature erişimi plan + module activation + membership ile zorunlu olmalı.
- **Dokümantasyon güncellemeleri:** Product scope, deployment/ops ve ilgili spec/rule dosyalarını güncellemek.
- **Başarı kriterleri:** Plan bazlı feature/limit kontrolleri tutarlı ve ölçülebilir biçimde çalışır.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Phase 8 - Mobile Platform Client

- **Hedef:** Mobil istemciyi platforma tenant-aware bir istemci olarak konumlandırmak.
- **Kod değişiklikleri:** Mobil auth/session/tenant context, module bazlı ekran açılımı, API sözleşme uyumu.
- **Enforcement gereksinimleri:** Aynı access doctrine (membership + role + module activation) ve tenant isolation uygulanmalı.
- **Dokümantasyon güncellemeleri:** Product shells/branding ve API/security notlarını mobil bağlamla genişletmek.
- **Başarı kriterleri:** Mobil istemci, aynı platform kurallarıyla çok tenantlı biçimde çalışır.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Phase 9 - Future Modules

- **Hedef:** Yeni alan module'lerini çekirdeğe zarar vermeden genişletebilmek.
- **Kod değişiklikleri:** Module bazlı schema/service/UI paketleri (örn. e-invoice, job manager, expense capture).
- **Enforcement gereksinimleri:** Module isolation, tenant scope, çekirdek tabloları değiştirme yasağı.
- **Dokümantasyon güncellemeleri:** Platform module'leri ve ilgili spec dosyalarını güncellemek.
- **Başarı kriterleri:** Yeni module'ler bağımsız ve güvenli biçimde aktive/deaktive edilir.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Phase Dependencies (Updated)

- Invitation security, membership-first access ve module activation enforcement katmanlari tamamlandi ve kilitlendi.
- AI Act MVP backend + UI teslim edildi; sonraki AI Act yatirimlari Post-MVP iyilestirme backlog'unda ele alinacaktir.
- Pilot/GTM fazi (Current Phase) mevcut teknik temel uzerinde gercek kullanim dogrulamasi ile ilerler.
- Advisor, billing ve future module genislemeleri pilot geri bildirimleri ve saha ogrenimleriyle onceliklendirilir.

---

## 6. MVP Tanımı (Delivered Scope)

MVP kapsamı:

- invitation acceptance
- tenant switching
- AI Act 10-question assessment
- risk classification

### Olmazsa Olmazlar

- Invitation acceptance (token + email match + membership create)
- Tenant switching (session context için güvenli geçiş)
- AI Act 10-question assessment akışı
- Temel risk sınıflandırma
- AI assessments versioned tutulur ve sistem başına tek `current` assessment kuralı uygulanır

### Olması Faydalı Olanlar

- Advisor dashboard ilk sürüm görünürlüğü
- Module activation gate'lerinin tüm yeni endpoint'lerde standartlaştırılması
- Audit log görünürlüğünün operasyonel raporlarda netleştirilmesi

### MVP Kapsamı Dışı (Açık Non-Goal'lar)

- automation workflow'leri yok
- integration'lar yok
- karmaşık dashboard'lar yok
- MVP sırasında çoklu module genişlemesi yok

### Şimdilik Yok

- Geniş kapsamlı billing/PSP otomasyonları
- İleri düzey AI/otomasyon özellikleri
- Çok sayıda yeni module'ün paralel geliştirilmesi
- AI Act export/report endpoint'leri (gelecek faz)

---

## 7. AI Act Post-MVP Improvements

- AI Act Wizard UX
- Obligations & Tasks UX improvement (prioritization + clarity)
- i18n polish (Turkish-first cleanup)
- AI Act result explanation improvements

---

## 8. Go-To-Market & Pilot Phase

- Demo script creation
- Pilot customer onboarding
- Feedback loop collection
- First sales narrative

---

## 9. Ürün Sıralaması

Önerilen sıra:

1. Platform onboarding
2. AI Document Intelligence Infrastructure
3. AI Act module
4. Advisor/client katmanı
5. Compliance export/reporting
6. Billing/pricing
7. Mobile tenant-aware istemci
8. Gelecek module'ler: e-invoice, Handwerker/job manager, expense capture

---

## 10. Teknik Kilometre Taşları

- schema hardening
- invitation security hardening (delivered)
- policy helper / enforcement standardizasyonu (delivered baseline)
- module activation guard enforcement (delivered)
- AI document ingestion pipeline
- OCR / VLM extraction + schema validation
- tenant-scoped AI storage + retrieval
- AI human review queue
- AI Act data model (delivered)
- AI Act assessment API (delivered)
- AI Act UI (delivered)
- report/export
- advisor dashboard

---

## 11. Karar Günlüğü

- Pointmor platform kimliği korunur.
- Cafe/loyalty alanı çekirdek değil, module olarak kalır.
- Repo kısa vadede bölünmez; tek platform reposu ile ilerlenir.
- `TenantMembership`, erişim için source of truth'tur.
- `User.tenantId`, legacy fallback olarak kalır (erişim kararı için kullanılmaz).
- Access doctrine: **membership + role + module activation**.
- Mobil istemci, yalnızca expense odaklı bir uygulama değil; platform istemcisidir.

---

## 12. Riskler ve Koruyucu Kurallar

- Cross-tenant data leak riski (tenant scope ihlali).
- Advisor privilege escalation riski (external kullanıcı yetki aşımı).
- Module boundary leakage riski (alan sorumluluklarının karışması).
- Seed verisinin legacy varsayımları gizleme riski.
- Pilot/GTM sinyalleri toplanmadan aşiri kapsam buyutme (overbuilding) riski.

Koruyucu kurallar:

- deny-by-default
- membership-first access
- transaction-safe kritik akışlar
- tenantId için zorunlu query scope
- doküman + test + enforcement birlikte ilerleme

---

## 13. Sonraki Adımlar (Current Phase)

1. Pilot onboarding playbook'unu standartlastirmak
2. Demo script ve ilk satis anlatisini paketlemek
3. Pilot geri bildirimlerini haftalik product karar ritmine baglamak
4. AI Act Post-MVP iyilestirmelerini pilot verisiyle onceliklendirmek
