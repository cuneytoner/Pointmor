# Pointmor Demo Deployment Runbook

## Amaç

Pointmor pre-alpha demo ortamını Debian VM üzerinde Docker Compose ile çalıştırmak ve Cloudflare Tunnel üzerinden dış erişime açmak.

## Gerekenler

- Debian VM
- Docker Engine
- Docker Compose plugin
- GitHub Container Registry erişimi
- Cloudflare tunnel token
- Demo için ayrı environment dosyası

## Önerilen env değişkenleri

### API
- `DATABASE_URL`
- `PORT`
- `HOST`
- `NODE_ENV`
- `COOKIE_SECRET`
- `CORS_ORIGINS`
- `CUSTOMER_PORTAL_JWT_SECRET`
- rate limit env'leri
- webhook secret'ları

### Web
- `VITE_API_BASE_URL`

### Cloudflare
- `CLOUDFLARE_TUNNEL_TOKEN`

## İlk kurulum

1. VM içinde çalışma dizini oluştur.
2. `docker-compose.demo.yml` ve `.env.demo` dosyalarını sunucuya koy.
3. Container registry login yap.
4. İlk kurulumda volume'ların temiz ve yeni olduğundan emin ol.
5. `docker compose --env-file .env.demo up -d postgres-demo`
6. DB hazır olduktan sonra API migration çalıştır.
7. Gerekirse yalnızca demo için seed çalıştır.
8. Tüm stack'i ayağa kaldır.

## Deploy akışı

```bash
cd /opt/pointmor-demo

docker compose --env-file .env.demo pull

docker compose --env-file .env.demo up -d

./infra/scripts/migrate-demo.sh
./infra/scripts/healthcheck-demo.sh
```

## Migration akışı

- Her deploy sonrası `prisma migrate deploy`
- Seed otomatik değil, manuel veya ilk kurulum senaryosunda

## Seed akışı

Öneri:

- `db:seed:demo` script'i yalnızca demo env ile çalışır
- Seed kullanıcıları ve şifreleri prod'a taşınmaz

## Health check

API için temel kontrol:

```bash
curl -fsS http://127.0.0.1:8080/health
```

Dış erişim kontrolü:

- Cloudflare Tunnel hostname üzerinden temel GET isteği
- Admin web yükleniyor mu
- Login ekranı açılıyor mu
- Demo tenant/PWA rota çalışıyor mu

## Cloudflare Tunnel notu

- DB public açılmaz
- Sadece web ve gerekiyorsa API route edilir
- Tunnel token env ile geçilir
- Gerekirse demo için access policy eklenir

## Sık karşılaşılan sorunlar

### 1. API kalkıyor ama DB'ye bağlanamıyor
- `DATABASE_URL` yanlış olabilir
- compose network ismi veya service name uyuşmuyor olabilir
- migration çalışmamış olabilir

### 2. Web açılıyor ama API'ye vuramıyor
- `VITE_API_BASE_URL` yanlış olabilir
- CORS origin eksik olabilir
- Tunnel route yanlış servis portuna gidiyor olabilir

### 3. Deploy sonrası login bozuldu
- `COOKIE_SECRET` değişmiş olabilir
- seed kullanıcıları resetlenmiş olabilir
- migration ile auth tablosunda uyumsuzluk oluşmuş olabilir

### 4. Her deploy'da demo veri resetleniyor
- volume yanlışlıkla yeniden yaratılıyor olabilir
- seed script'i otomatik çalışıyor olabilir

## Rollback önerisi

- Her build'i SHA tag ile yayınla
- Son başarılı tag'i kaydet
- Gerektiğinde compose image tag'lerini önceki SHA'ya çevirip yeniden `up -d` yap
