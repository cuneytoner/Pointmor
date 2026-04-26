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

## 3. Mevcut Faz — Faz 2: Davet Kabul Akışı

Bu fazın hedefi, davet kabulünü platform doktrinine uygun biçimde tamamlamaktır:

**invite → accept → membership created → access granted**

Bu akış, advisor/client onboarding için kritik temel sağlar; erişim yalnızca `TenantMembership` oluşturulduktan sonra başlar.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

---

## 4. Sonraki Fazlar (Faz 3+)

## Faz 3 — Policy Helpers + Module Activation Enforcement

- **Hedef:** Erişim kararını her tenant kapsamlı endpoint üzerinde tek tip policy helper ile zorunlu kılmak.
- **Kod değişiklikleri:** Ortak guard/policy helper genişletmeleri; module activation kontrolünü route/service katmanında standartlaştırmak.
- **Enforcement gereksinimleri:** deny-by-default, tenantId scope, membership + role + module activation.
- **Dokümantasyon güncellemeleri:** API tasarımı, security ve enforcement contract örneklerini policy helper yaklaşımıyla hizalamak.
- **Başarı kriterleri:** Module kapalıyken ilgili API/UI yüzeyi erişilemez; yeni endpoint'ler policy helper olmadan merge edilmez.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

### Durum Notu

- Faz 4 için onboarding API tasarımı tamamlandı ve backend implementasyonu başlatıldı.
- AI output bu fazda suggestion olarak ele alınır; source of truth değildir.

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Phase 3.5 — AI Document Intelligence Infrastructure

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

## Faz 4 — AI Act MVP

- **Hedef:** İlk loyalty dışı module için çalışan bir MVP üretmek.
- **Kod değişiklikleri:** `AiSystem`, `AiAssessment`, `AiAssessmentAnswer`, `AiObligation`, `AiTask`, `AiEvidence`, `AiDocumentLink` tenant-scoped veri modeli; değerlendirme/risk akışı için derived-data kurgusu.
- **Enforcement gereksinimleri:** Tenant izolasyonu, membership tabanlı erişim, module activation gate.
- **Dokümantasyon güncellemeleri:** AI Act spec dosyasını endpoint/model ve akış detaylarıyla güncellemek; paylaşılan AI infrastructure spec ve AI risk guardrail dokümanlarıyla birlikte tutmak.
- **Başarı kriterleri:** 10 soruluk assessment akışı tamamlanır; risk sınıfı ve temel rapor üretimi çalışır.
- **RBAC kararı:** `ai_act.manage` yalnızca owner/admin; member/manager ve advisor için kapsam `ai_act.view` + `ai_act.assess`.
- **API kapsam notu:** `GET /ai-act/systems/:id/obligations` MVP kapsamındadır; `ai_act.export` reserve edilir, export endpoint'i bu fazda uygulanmaz.

### Tamamlanma Kriterleri

- kod uygulandı
- testler geçiyor
- enforcement kuralları doğrulandı
- dokümantasyon güncellendi
- cross-tenant access ihlali yok

### Çıkış Kriterleri

- üretim hazırı uygulama
- uç durumlar için test kapsamı
- cross-tenant access ihlali yok
- manuel uçtan uca doğrulama

### Yön Değiştirme / Sonlandırma Kriterleri

Kullanıcılar şu davranışları göstermiyorsa:
- assessment tamamlamıyorsa
- raporu indirmiyorsa
- ürüne geri dönmüyorsa

O zaman:
- soru seti sadeleştirilir
- UX iyileştirilir
- değer önerisi yeniden değerlendirilir

### Analiz Ekleri
- Ürün analizi:
- Teknik analiz:
- GTM / satış analizi:
- Risk analizi:
- Açık sorular:

## Faz 5 — Advisor Gösterge Paneli

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

## Faz 6 — Ürünleştirme + Billing

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

## Faz 7 — Mobil Platform İstemcisi

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

## Faz 8 — Gelecek Module'ler

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

## Faz Bağımlılıkları

- Faz 2, Faz 3'ten önce tamamlanmalıdır.
- Faz 3, Faz 3.5'ten önce tamamlanmalıdır.
- Faz 3.5, Faz 4'ten önce tamamlanmalıdır.
- Faz 4 (AI Act MVP) aşağıdakiler tamamlanmadan başlamamalıdır:
  - invitation flow kararlı olmalıdır
  - module activation guard enforce edilmiş olmalıdır
  - AI Document Intelligence altyapısı (Faz 3.5) çalışır ve tenant-scope doğrulanmış olmalıdır
- Faz 5, Faz 4 veri modeli ve erişim stabilitesine bağlıdır.

---

## 5. MVP Tanımı

MVP kapsamı:

- invitation acceptance
- tenant switching
- AI Act 10-question assessment
- risk classification
- basic compliance report/export

### Olmazsa Olmazlar

- Invitation acceptance (token + email match + membership create)
- Tenant switching (session context için güvenli geçiş)
- AI Act 10-question assessment akışı
- Temel risk sınıflandırma
- Temel compliance report/export

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

---

## 6. Ürün Sıralaması

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

## 7. Teknik Kilometre Taşları

- schema hardening
- invitation acceptance
- policy helper standardizasyonu
- module activation guard enforcement
- AI document ingestion pipeline
- OCR / VLM extraction + schema validation
- tenant-scoped AI storage + retrieval
- AI human review queue
- AI Act data model
- AI Act assessment API
- AI Act UI
- report/export
- advisor dashboard

---

## 8. Karar Günlüğü

- Pointmor platform kimliği korunur.
- Cafe/loyalty alanı çekirdek değil, module olarak kalır.
- Repo kısa vadede bölünmez; tek platform reposu ile ilerlenir.
- `TenantMembership`, erişim için source of truth'tur.
- `User.tenantId`, legacy fallback olarak kalır (erişim kararı için kullanılmaz).
- Access doctrine: **membership + role + module activation**.
- Mobil istemci, yalnızca expense odaklı bir uygulama değil; platform istemcisidir.

---

## 9. Riskler ve Koruyucu Kurallar

- Cross-tenant data leak riski (tenant scope ihlali).
- Advisor privilege escalation riski (external kullanıcı yetki aşımı).
- Module boundary leakage riski (alan sorumluluklarının karışması).
- Seed verisinin legacy varsayımları gizleme riski.
- AI Act MVP doğrulanmadan aşırı kapsam büyütme (overbuilding) riski.

Koruyucu kurallar:

- deny-by-default
- membership-first access
- transaction-safe kritik akışlar
- tenantId için zorunlu query scope
- doküman + test + enforcement birlikte ilerleme

---

## 10. Sonraki Adımlar

1. invitation acceptance flow'u uygulamak
2. route/service testlerini doğrulamak
3. advisor dokümantasyonunu güncellemek
4. module activation guard'ını genişletmek
5. AI Act MVP schema'sını hazırlamak
