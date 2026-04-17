# Compliance: dışa aktarım ve GDPR-lite

## Uçlar (kiracı kapsamlı)

| Uç | İzin |
|----|------|
| `GET /tenant/audit/export/csv` | `audit.export` (owner) |
| `GET /tenant/audit/export/pdf` | `audit.export` (owner) |
| `GET /tenant/summary/export/pdf` | `summary.export` (manager, owner) |
| `GET /tenant/anomalies/export/pdf` | `anomaly.export` (manager, owner); plan `manager_closing` |
| `GET /tenant/customers/:id/gdpr-export` | `gdpr.customer_export` (owner) |
| `POST /tenant/customers/:id/anonymize` | `settings.manage` |

## Redaksiyon

CSV ve JSON dışa aktarımlarında audit/anomali payload’ları `export-redaction` ile maskelenir; GDPR müşteri export’unda telefon kısaltılır, e-posta maskelenir.

## `data_export` audit kaydı

`eventType: data_export` ile yalnızca `exportKind`, `format` ve filtre özeti yazılır; dışa aktarılan satır içeriği loglanmaz.

## Oran sınırı

Dışa aktarım uçları dakikada 15 istek ile sınırlıdır (genel API limitine ek).
