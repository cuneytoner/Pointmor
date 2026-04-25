# Veri saklama — kurallar

## Süre kuralları (varsayılan)

| Veri | Varsayılan | Env |
|------|------------|-----|
| Operasyonel `AuditEvent` (`EXPORT` hariç) | 90 gün | `RETENTION_OPERATIONAL_AUDIT_DAYS` |
| `EXPORT` audit | 30 gün | `RETENTION_EXPORT_AUDIT_DAYS` |
| `AnomalySignal` | 60 gün | `RETENTION_ANOMALY_DAYS` |
| `NotificationDelivery` | 45 gün | `RETENTION_MESSAGING_DELIVERY_DAYS` |
| Platform `AuditLog` | 90 gün | `RETENTION_PLATFORM_AUDIT_LOG_DAYS` |
| `ProductAnalyticsEvent` | 180 gün | `RETENTION_PRODUCT_ANALYTICS_DAYS` |

Kural: `RETENTION_*_DAYS=never|off|0` ise ilgili temizlik kapalıdır.

## Çalıştırma kuralları

- CLI: `npm run job:retention`
- Dry run: `npm run job:retention -- --dry-run`
- HTTP job: `POST /internal/jobs/retention?dryRun=1` + `X-Retention-Job-Secret`
- Tenant policy okuma: `GET /tenant/retention-policy` (`settings.view`)

## Güvenlik kuralları

- Batch limiti: `RETENTION_CLEANUP_BATCH_SIZE`
- Tur limiti: `RETENTION_CLEANUP_MAX_BATCHES_PER_TABLE`
- Tenant izolasyonu korunur; kapsam yalnızca yetkili temizleme akışıyla yürütülür.

## Kod referansı

- `apps/api/src/lib/retention-config.ts`
- `apps/api/src/lib/retention-cleanup-service.ts`
- `apps/api/src/jobs/run-retention-cleanup.ts`
