# Cursor Prompt 01 - Master Plan

Pointmor monorepo için pre-alpha demo deployment ve CI/CD altyapısı kur.

## Bağlam
- Repo npm workspaces monorepo
- apps/api: Node 20+, Fastify 5, TypeScript, Prisma 7, PostgreSQL
- apps/admin-web: React 18, Vite 6, TypeScript, React Router 7, vite-plugin-pwa
- DB PostgreSQL, Redis/queue yok
- Mevcut resmi CI/CD yok
- Pre-alpha demo ortamı Debian VM üzerinde Docker Compose ile ayağa kalkacak
- Dış erişim Cloudflare Tunnel ile sağlanacak
- Demo ortamı dev ortamından ve dev DB'den ayrılmalı
- Production için zayıf default secret veya seed şifre kullanılmamalı

## Hedef
1. apps/api için production uygun Dockerfile oluştur
2. apps/admin-web için production uygun Dockerfile oluştur
3. root veya infra/docker altında docker-compose.demo.yml oluştur
4. compose içinde şu servisleri tanımla:
   - postgres-demo
   - api-demo
   - admin-web-demo
   - cloudflared
5. API servisi için healthcheck tanımla
6. admin-web servisini API base URL env ile çalışacak şekilde düzenle
7. .env.demo.example oluştur
8. Prisma migrate deploy akışını demo deploy sürecine uygun hale getir
9. demo seed için ayrı ve güvenli bir seed çalıştırma yaklaşımı öner, gerekiyorsa npm script ekle
10. .github/workflows/ci.yml oluştur
11. .github/workflows/deploy-demo.yml tasarla
12. infra/scripts altında deploy-demo.sh, migrate-demo.sh ve gerekiyorsa seed-demo.sh oluştur
13. README veya docs altına Demo Deployment dokümanı ekle

## Kurallar
- Dev DB asla public expose edilmesin
- Demo DB ayrı volume kullansın
- Seed kullanıcıları ve demo şifreleri production için kullanılmasın
- Secret değerler koda gömülmesin
- Çıktılar incremental ve review-friendly olsun
- Gereksiz büyük mimari sıçramalar yapma, mevcut monorepo yapısını koru

## Teslim formatı
- Önce yapılacak değişiklikleri kısa plan olarak yaz
- Sonra dosya dosya değiştir
- Her dosya için neden eklendiğini kısaca belirt
- En sonda local test ve demo deploy komutlarını ver
