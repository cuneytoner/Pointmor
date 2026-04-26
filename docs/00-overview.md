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
4. Ürün kapsamı: [`20-rules-001-product-scope.md`](./20-rules-001-product-scope.md)
5. Veritabanı reset/seed operasyonları: [`40-guide-009-database-reset-and-seed.md`](./40-guide-009-database-reset-and-seed.md)

## Dokümantasyon yapısı

- `10-meta-*`: ürün ve platform tanımı
- `20-rules-*`: müzakere edilemez mimari ve mühendislik kuralları
- `30-spec-*`: module ve ürün yüzeyi spesifikasyonları
- `40-guide-*`: operasyon runbook'ları ve komut rehberleri
- `41-ref-*`: kısa referanslar (RBAC, seed users, compliance)
- `42-design-*`: UI ve akış tasarım kararları

## Kanonik kavram sahipliği

- Platform kimliği ve doktrini: `10-meta-004`
- Proje planı / yol haritası: `10-meta-005` (tek kaynak)
- Tenant/membership/module kuralları: `20-rules-001`, `20-rules-003`, `20-rules-013`
- schema/API/security enforcement: `20-rules-016`, `20-rules-004`, `20-rules-015`, `20-rules-017`
- Demo deployment: `40-guide-004` (tek kaynak)
- RBAC: `41-ref-002-tenant-rbac.md` (tek kaynak)
- Seed users: `41-ref-001-dev-seed-users.md` (tek kaynak)
