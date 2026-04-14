# Pointmor Next Step Pack

Bu paket, Pointmor monorepo yapısına daha yakın ikinci adım taslaklarını içerir.

İçerik:
- repo içi önerilen dosya ağacı
- demo için örnek `docker-compose.demo.yml`
- `.env.demo.example`
- GitHub Actions `ci.yml` ve `deploy-demo.yml` taslakları
- deploy/migrate/seed/healthcheck script taslakları
- Cursor için repo’ya daha yakın prompt paketi

Notlar:
- Bu dosyalar doğrudan kopyala-yapıştırdan önce repo script isimleriyle eşleştirilmelidir.
- `db:seed:demo` gibi scriptler örnek olarak verilmiştir. Eğer repoda yoksa eklenmelidir.
- `admin-web` static build çıkış klasörü için Vite varsayımı (`dist/`) esas alınmıştır.
