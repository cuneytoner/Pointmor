# Compliance dışa aktarımları — kurallar

## Uçlar ve izinler

| Endpoint | İzin |
|----|------|
| `GET /tenant/audit/export/csv` (`/audit/export/csv`) | `audit.export` |
| `GET /tenant/audit/export/pdf` (`/audit/export/pdf`) | `audit.export` |
| `GET /tenant/summary/export/pdf` (`/summary/export/pdf`) | `summary.export` |
| `GET /tenant/anomalies/export/pdf` (`/anomalies/export/pdf`) | `anomaly.export` (+ plan kısıtı) |
| `GET /tenant/customers/:id/gdpr-export` | `gdpr.customer_export` |
| `POST /tenant/customers/:id/anonymize` | `settings.manage` |

Audit export filtreleri: `from`, `to`, `eventType`, `actorUserId`, `branchId`, `entityType`, `entityId`, `maxRows`.

## Redaksiyon kuralları

- Ham payload dışa aktarılmaz; yalnızca redakte özet verilir.
- GDPR export alanları maskelenir (özellikle iletişim verileri).
- Anomaly export müşteri kimliğini kısaltılmış gösterir.

## Audit kaydı kuralları

- Dışa aktarım olayları `eventType: EXPORT` ile loglanır.
- Log içeriğinde yalnızca export tipi ve filtre özeti tutulur.
- Dışa aktarılan dosyanın ham içeriği loglanmaz.

## Rate limit

- Export endpoint'leri: dakika başına 15 istek (genel API limitine ek).

## İlgili doküman

- [`41-ref-007-data-retention.md`](./41-ref-007-data-retention.md)
