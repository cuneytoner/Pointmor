# AI Document Intelligence Riskleri

## 1. Amaç

Bu doküman, AI destekli doküman anlama katmanı için güvenlik, gizlilik, denetlenebilirlik ve uyumluluk risklerini tanımlar.  
Amaç, OCR/VLM/LLM tabanlı doküman işleme süreçlerinde riskleri erken görünür kılmak ve platform genelinde uygulanacak guardrail kurallarını netleştirmektir.

---

## 2. Ana riskler

### Tenant data leakage

- vector DB retrieval her zaman `tenantId` filtresi ile çalışmalıdır.
- tenant'lar arasında embedding paylaşımı olmamalıdır (no cross-tenant embeddings).
- tenant'lar arasında ortak prompt context kullanılmamalıdır.

### Sensitive document exposure

- Yüklenen sözleşmeler, faturalar, fişler, policy dokümanları PII, finansal veri ve ticari sır içerebilir.
- Açıkça izin verilmediği sürece uygulama log'ları raw document içeriğini tutmamalıdır.

### Hallucination risk

- LLM/VLM önerileri ground truth değildir.
- Mümkün olan her yerde çıktı confidence ve source reference bilgisi içermelidir.

### OCR / extraction errors

- Yanlış toplam, yanlış tarih, yanlış madde/clauses çıkarımı oluşabilir.
- confidence eşiğinin altında human review zorunlu olmalıdır.

### Training data risk

- Kullanıcı dokümanları varsayılan olarak training için kullanılmamalıdır.
- Kullanım yalnızca explicit opt-in ile mümkün olmalıdır.
- Tenant seviyesinde açık consent zorunludur.
- Data minimization zorunludur.

### Auditability risk

- Her extraction işlemi için model version, prompt version, input document id, output JSON, confidence ve reviewer değişiklikleri saklanmalıdır.

### Prompt injection risk

- Doküman içeriği zararlı komutlar içerebilir.
- Model, doküman içeriğini untrusted input olarak ele almalıdır.
- System prompt, doküman metni tarafından override edilmemelidir.

### Vector retention risk

- embedding verileri semantik bilgi sızdırabilir.
- embedding silme işlemi doküman silme/retention kurallarıyla uyumlu olmalıdır.

### External provider risk

- Harici AI API kullanılıyorsa veri transfer kuralları açıkça dokümante edilmelidir.
- Tenant, işlemenin local mi external mı olduğunu bilmelidir.

---

## 3. Required guardrails

- Tüm AI verilerinde `tenantId` zorunludur.
- module activation zorunludur.
- Düşük confidence çıktılarında human review zorunludur.
- Otonom legal/compliance final decision verilemez.
- confidence score zorunludur.
- Sözleşme/compliance önerileri için source trace zorunludur.
- audit log zorunludur.
- retention policy zorunludur.
- Silme süreci; uygun olduğu ölçüde document, extraction, embeddings ve review kayıtlarını birlikte kaldırmalıdır.

---

## 4. Training data policy

- Varsayılan politika: customer document verisi ile training yapılmaz.
- Sadece opt-in ile training mümkündür.
- anonymization/pseudonymization zorunludur.
- Düzeltilmiş extraction çıktıları ayrı veri kümesinde saklanmalıdır.
- Dataset lineage korunmalıdır.
- Tenant-level exclusion desteklenmelidir.
- Tam anonymization ve policy onayı olmadan tenant verileri training veri setinde karıştırılmamalıdır.

---

## 5. Audit requirements

Her AI processing job için aşağıdaki alanlar kaydedilmelidir:

- `tenantId`
- `module`
- `documentId`
- `jobId`
- model name/version
- prompt version
- extraction schema version
- confidence
- review yapıldıysa reviewer `userId`
- before/after correction
- timestamp

---

## 6. Forbidden patterns

- `tenantId` filtresi olmadan retrieval
- opt-in olmadan customer document ile training
- raw document içeriğini application log'larına yazmak
- LLM çıktısını nihai legal advice olarak kabul etmek
- cross-tenant prompt context
- tenant'a bildirim olmadan external AI processing

---

## 7. Open questions

- local-only inference mı, hybrid external inference mı?
- Extracted text için retention süresi ne olmalı?
- document silindiğinde embedding hemen siliniyor mu?
- training data consent modeli nasıl uygulanmalı?

---

## Platform AI Contract

AI Document Intelligence, auth/session benzeri bir çekirdek platform kabiliyetidir; yalnızca bir feature olarak ele alınmaz.

Tüm AI processing akışları:

- tenant-scoped olmalıdır
- module-scoped olmalıdır
- auditable olmalıdır
- access control mekanizmasını asla bypass etmemelidir
- module activation kurallarına uymalıdır

AI output verisi source of truth değildir.  
Document içeriği source of truth olarak kalır.

AI output verisi:

- derived
- probabilistic
- validation sürecine tabi

---

## Source of Truth Rule

- uploaded document = source of truth
- extracted JSON = derived data
- suggested actions = non-authoritative

Hiçbir AI output:

- original data'yı overwrite edemez
- final compliance decision olarak kullanılamaz
- gerekli yerlerde validation olmadan kullanılamaz

---

## Embedding and Retrieval Risk

Embeddings may leak semantic information.

Risks:

- cross-tenant retrieval leakage
- similarity inference attacks
- reconstruction of sensitive content

Rules:

- all vector queries MUST include tenantId filter
- no shared embedding space without tenant segmentation
- embeddings MUST be deleted when document is deleted
- embedding metadata MUST include tenantId and documentId
- no global similarity search across tenants

---

## Prompt Isolation Rule

- document content is untrusted input
- system prompts must not be overridden by document text
- no cross-document context mixing across tenants
