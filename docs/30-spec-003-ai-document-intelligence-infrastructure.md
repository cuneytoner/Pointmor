# AI Document Intelligence Altyapı Gereksinimleri

## 1. Amaç

Bu doküman, doküman sınıflandırma, extraction, retrieval ve aksiyon öneri üretimi için paylaşılan platform servis gereksinimlerini tanımlar.  
Altyapı, tek bir module yerine platform seviyesinde ortak bir katman olarak konumlanır ve Tenant izolasyonunu temel ilke olarak uygular.

Desteklenecek ana kullanım alanları:

- AI Act module
- expense capture
- contract review
- e-invoice
- advisor workflows

---

## 2. Core capabilities

- document upload
- file validation
- document classification
- OCR / VLM extraction
- structured JSON extraction
- confidence scoring
- human review
- tenant-scoped retrieval
- action suggestion
- audit trail

---

## 3. MVP architecture

Pointmor API  
→ job queue  
→ AI worker  
→ OCR/VLM processor  
→ validation layer  
→ PostgreSQL  
→ Qdrant/vector DB  
→ review UI

Bu akışta uzun süren işlemler sync endpoint yerine queue + worker modeliyle yürütülür. API katmanı yalnızca job oluşturma, durum takip ve sonuç retrieval sorumluluğunu taşır.

---

## 4. Data model draft

### AiDocument

- id
- tenantId
- module
- uploadedByUserId
- fileName
- mimeType
- storageKey
- sha256
- documentType
- status
- createdAt

### AiDocumentJob

- id
- tenantId
- documentId
- jobType
- status
- errorCode
- modelName
- modelVersion
- promptVersion
- startedAt
- completedAt

### AiExtraction

- id
- tenantId
- documentId
- jobId
- extractionSchema
- extractedJson
- confidence
- requiresReview
- createdAt

### AiReview

- id
- tenantId
- extractionId
- reviewedByUserId
- correctedJson
- reviewStatus
- createdAt

### AiEmbedding

- id
- tenantId
- documentId
- chunkIndex
- vectorRef
- metadata
- createdAt

Not: Tüm entity ilişkileri schema seviyesinde Tenant scope garantileyecek şekilde tasarlanmalı; migration ve seed akışları bu modele uyumlu olmalıdır.

---

## 5. Module integration

AI Act kullanımı:

- contracts
- vendor AI terms
- AI system descriptions
- policy documents

expense capture kullanımı:

- receipts
- invoices
- payment documents

contract review kullanımı:

- contracts
- DPAs
- vendor agreements

Bu entegrasyon modeli, ortak AI altyapı katmanının module bazlı çıktılar üretmesini ve RBAC/auth/session kurallarıyla güvenli erişim sağlamasını hedefler.

---

## 6. Deployment model

### MVP / low-cost

- PostgreSQL
- Redis queue
- Qdrant
- AI worker
- CPU OCR
- optional local Ollama/VLM
- external GPU worker only if required

### Growth stage

- separate AI worker service
- queue-based async processing
- object storage
- vector DB backup/retention
- monitoring for job latency/errors
- model/prompt versioning

### Scale stage

- GPU worker pool
- tenant-level processing limits
- priority queues
- batch processing
- per-module cost attribution

---

## 7. Cost strategy

- start CPU-first
- avoid fine-tuning in MVP
- use small models
- process async
- cache extraction results
- only run VLM when needed
- fallback to OCR + LLM for simpler documents
- track cost per tenant/module

Amaç, erken fazda maliyeti kontrol altında tutarken kaliteyi human review ile güvencelemektir.

---

## 8. Security requirements

- tenantId on every record
- vector DB tenant filter mandatory
- no cross-tenant retrieval
- no raw document logging
- retention/deletion support
- human review for low confidence
- module activation required
- audit trail required

Ek olarak: API endpoint seviyesinde auth + RBAC zorunlu olmalı, token ve session bağlamı TenantMembership ile doğrulanmalıdır.

---

## 9. Growth requirements

### Stage 1 — MVP

- low volume
- manual review
- local/small worker
- AI Act documents only

### Stage 2 — Multi-module

- expense capture
- contract review
- advisor workflows
- queue scaling

### Stage 3 — Production AI platform

- GPU workers
- model registry
- prompt registry
- evaluation dataset
- tenant-level quotas
- billing/cost tracking

---

## 10. Non-goals

- no custom training in MVP
- no fully autonomous legal conclusion
- no cross-tenant learning
- no replacing professional review
- no real-time blocking UX for long AI jobs

---

## 11. Open questions

- local-only or hybrid external inference
- document retention period
- embedding deletion policy
- review UI priority
- first supported document types
- model choice for first prototype
