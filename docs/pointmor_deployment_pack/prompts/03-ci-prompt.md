# Cursor Prompt 03 - CI

Pointmor için minimal ama ciddi bir CI pipeline kur.

## İstiyorum
- .github/workflows/ci.yml
- Node 20
- npm ci
- root lint
- root build
- Prisma generate/validate odaklı kontrol
- admin-web için mevcut i18n doğrulaması da dahil edilsin

## Kurallar
- Test framework henüz yoksa sahte test ekleme
- Fail-fast ama anlaşılır pipeline olsun
- Monorepo için cache mantıklı kullanılsın

Önce mevcut package script'lere göre ihtiyaç duyulan küçük script düzenlemelerini öner, sonra workflow dosyasını yaz.
