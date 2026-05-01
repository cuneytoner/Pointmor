# Pointmor Dokümantasyon Genel Bakış

Bu dosya dokümantasyonun tek giriş noktasıdır.

Pointmor modüler çok kiracılı bir platformdur.  
Kullanıcılar tenant'lara membership üzerinden erişir.  
İşlevsellik module'ler üzerinden sunulur.

## Terminoloji

- Tenant: sistem seviyesinde organizasyon
- Workspace: UI terimi (Tenant karşılığı)
- TenantMembership: kullanıcının tenant içindeki erişim ilişkisi
- module: platforma eklenen bağımsız işlev paketi
- role: kullanıcı yetki seviyesi
- API: sistem arayüzü
- endpoint: API çağrı noktası

## Nereden başlanmalı

1. Çekirdek tanım: [`10-meta-004-core-platform-definition.md`](./10-meta-004-core-platform-definition.md)
2. Kurallar dizini (kanonik harita): [`10-meta-001-rules-index.md`](./10-meta-001-rules-index.md)
3. Kanonik proje planı / yol haritası: [`10-meta-005-platform-project-plan.md`](./10-meta-005-platform-project-plan.md)
4. AI Infrastructure implementation backlog: [`10-meta-006-ai-infrastructure-implementation-backlog.md`](./10-meta-006-ai-infrastructure-implementation-backlog.md)
5. Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
6. Veritabanı reset/seed operasyonları: [`40-guide-009-database-reset-and-seed.md`](./40-guide-009-database-reset-and-seed.md)
7. Dev Debian VM PostgreSQL service runbook: [`40-guide-010-dev-vm-postgresql-service.md`](./40-guide-010-dev-vm-postgresql-service.md)

## Dokümantasyon yapısı

- `10-meta-*`: ürün ve platform tanımı
- `20-rules-*`: müzakere edilemez mimari ve mühendislik kuralları
- `30-spec-*`: module ve ürün yüzeyi spesifikasyonları
- `40-guide-*`: operasyon runbook'ları ve komut rehberleri
- `41-ref-*`: kısa referanslar (RBAC, seed users, compliance)
- `42-design-*`: UI ve akış tasarım kararları

## AI Document Intelligence navigasyonu

- Risk / security guardrails: [`20-rules-019-ai-document-intelligence-risk.md`](./20-rules-019-ai-document-intelligence-risk.md)
- AI governance and risk controls: [`20-rules-020-ai-governance-and-risk-controls.md`](./20-rules-020-ai-governance-and-risk-controls.md)
- Deterministic compliance doctrine: [`20-rules-021-deterministic-compliance-doctrine.md`](./20-rules-021-deterministic-compliance-doctrine.md)
- Platform AI infrastructure spec: [`30-spec-003-ai-document-intelligence-infrastructure.md`](./30-spec-003-ai-document-intelligence-infrastructure.md)
- AI infrastructure strategy: [`30-spec-004-ai-infrastructure-strategy.md`](./30-spec-004-ai-infrastructure-strategy.md)
- AI Gateway architecture: [`30-spec-005-ai-gateway-architecture.md`](./30-spec-005-ai-gateway-architecture.md)
- Pointmor Local Agent spec: [`30-spec-006-pointmor-local-agent.md`](./30-spec-006-pointmor-local-agent.md)
- AI feature classification matrix: [`30-spec-007-ai-feature-classification-matrix.md`](./30-spec-007-ai-feature-classification-matrix.md)
- Tenant AI budgeting and cost isolation: [`30-spec-008-tenant-ai-budgeting-and-cost-isolation.md`](./30-spec-008-tenant-ai-budgeting-and-cost-isolation.md)
- Data residency and regional AI strategy: [`30-spec-009-data-residency-and-regional-ai-strategy.md`](./30-spec-009-data-residency-and-regional-ai-strategy.md)
- AI Gateway MVP technical design: [`30-spec-010-ai-gateway-mvp-technical-design.md`](./30-spec-010-ai-gateway-mvp-technical-design.md)
- Certified AI hardware profiles: [`41-ref-008-certified-ai-hardware-profiles.md`](./41-ref-008-certified-ai-hardware-profiles.md)
- AI deployment packaging: [`41-ref-009-ai-deployment-packaging.md`](./41-ref-009-ai-deployment-packaging.md)

## Kanonik kavram sahipliği

- Platform kimliği ve doktrini: `10-meta-004`
- Proje planı / yol haritası: `10-meta-005` (tek kaynak)
- Tenant/membership/module kuralları: `20-rules-001`, `20-rules-003`, `20-rules-013`
- schema/API/security enforcement: `20-rules-016`, `20-rules-004`, `20-rules-015`, `20-rules-017`
- Demo deployment: `40-guide-004` (tek kaynak)
- RBAC: `41-ref-002-tenant-rbac.md` (tek kaynak)
- Seed users: `41-ref-001-dev-seed-users.md` (tek kaynak)
