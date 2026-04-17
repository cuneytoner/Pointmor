# Data retention ve temizlik

## Amaç

- Veri ömrünü kontrol altına almak, depolama maliyetini düşürmek, GDPR-lite ile uyum (müşteri silme/anonymize ayrı akıştır).
- İlk sürüm: **hard delete**; arşiv (S3 / cold tablo) ileride `cleanupStrategy: archive_future` ile genişletilebilir.

## Varsayılan süreler (override: ortam değişkenleri)

| Veri | Varsayılan | Env |
|------|------------|-----|
| Operasyonel `AuditEvent` (EXPORT hariç) | 90 gün | `RETENTION_OPERATIONAL_AUDIT_DAYS` |
| `EXPORT` tipi audit (dışa aktarım meta) | 30 gün | `RETENTION_EXPORT_AUDIT_DAYS` |
| `AnomalySignal` | 60 gün | `RETENTION_ANOMALY_DAYS` |
| `NotificationDelivery` (mesajlaşma log) | 45 gün | `RETENTION_MESSAGING_DELIVERY_DAYS` |
| Platform `AuditLog` | 90 gün | `RETENTION_PLATFORM_AUDIT_LOG_DAYS` |
| `ProductAnalyticsEvent` | 180 gün | `RETENTION_PRODUCT_ANALYTICS_DAYS` |
| Ziyaret / sadakat işlemleri | otomatik silme yok | — |

`RETENTION_*_DAYS=never` (veya `off` / `0`) ilgili tabloyu cleanup’tan çıkarır.

## Çalıştırma

1. **CLI (günlük cron):** `npm run job:retention` — `apps/api` içinde, `DATABASE_URL` gerekli.  
   `npm run job:retention -- --dry-run` sadece sayım.

2. **HTTP (K8s CronJob):** `RETENTION_JOB_SECRET` tanımlıysa  
   `POST /internal/jobs/retention?dryRun=1`  
   Başlık: `X-Retention-Job-Secret: <secret>` veya `Authorization: Bearer <secret>`.

3. **Kiracı bilgisi (salt okunur):** `GET /tenant/retention-policy` — `settings.view`.

## Güvenlik

- Batch boyutu: `RETENTION_CLEANUP_BATCH_SIZE` (varsayılan 500), tur sınırı: `RETENTION_CLEANUP_MAX_BATCHES_PER_TABLE`.
- Tenant izolasyonu: `tenantId` ile tek kiracı temizliği (manuel) mümkün; global job tüm kiracılar için `tenantId` filtresiz çalışır.

## İlgili kod

- `apps/api/src/lib/retention-config.ts`
- `apps/api/src/lib/retention-cleanup-service.ts`
- `apps/api/src/jobs/run-retention-cleanup.ts`
