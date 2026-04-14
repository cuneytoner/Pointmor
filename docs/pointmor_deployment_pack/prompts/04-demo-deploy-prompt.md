# Cursor Prompt 04 - Demo Deploy

Pointmor için Debian VM hedefli demo deploy süreci hazırla.

## İstiyorum
- .github/workflows/deploy-demo.yml
- infra/scripts/deploy-demo.sh
- infra/scripts/migrate-demo.sh
- opsiyonel infra/scripts/seed-demo.sh
- Docker Compose tabanlı deploy akışı
- migrate deploy sonrası health check
- seed yalnızca manuel veya ilk kurulum senaryosuna uygun olsun

## Varsayımlar
- Hedef sunucuda Docker ve Docker Compose mevcut
- Secret'lar GitHub Actions secrets içinde olacak
- Demo ortamı main branch'ten deploy edilecek
- Cloudflare Tunnel sunucu tarafında compose ile çalışacak

## Kurallar
- Production secret'ları repo içine yazma
- Seed verisini otomatik her deploy'da çalıştırma
- Rollback için son çalışan image tag mantığı öner
- Sonuçta gerekli GitHub secrets listesini çıkar
