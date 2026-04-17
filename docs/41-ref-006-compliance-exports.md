# Compliance: dışa aktarım ve GDPR-lite

## Uçlar (kiracı kapsamlı)

Aşağıdaki yollar **çift kayıtlıdır**: `/tenant/...` (mevcut) ve kök alias (`/audit/...`, `/summary/...`, `/anomalies/...`) — aynı işleyici ve izinler.

| Uç | İzin |
|----|------|
| `GET /tenant/audit/export/csv` · `GET /audit/export/csv` | `audit.export` (owner) |
| `GET /tenant/audit/export/pdf` · `GET /audit/export/pdf` | `audit.export` (owner) |
| `GET /tenant/summary/export/pdf` · `GET /summary/export/pdf` | `summary.export` (manager, owner) |
| `GET /tenant/anomalies/export/pdf` · `GET /anomalies/export/pdf` | `anomaly.export` (manager, owner); plan `manager_closing` |
| `GET /tenant/customers/:id/gdpr-export` | `gdpr.customer_export` (owner) |
| `POST /tenant/customers/:id/anonymize` | `settings.manage` |

**Sorgu parametreleri (audit CSV/PDF):** `from`, `to` (ISO), `eventType`, `actorUserId`, `branchId`, `entityType`, `entityId`, `maxRows`.

## Redaksiyon

- CSV’de audit payload sütunu **`payload_summary`**: redakte JSON, uzunluk sınırlı (ham döküm değil).
- PDF satırlarında payload **kısa özet** (birkaç alan + uzunluk sınırı).
- Anomali PDF’de müşteri kimliği **kısaltılmış** gösterilir; payload `export-redaction` ile uyumlu özetlenir.
- GDPR müşteri export’unda telefon kısaltılır, e-posta maskelenir.

## `EXPORT` audit kaydı

`eventType: EXPORT` ile yalnızca `exportKind`, `exportType` (CSV / PDF / JSON) ve **filtre özeti** yazılır; dışa aktarılan dosya içeriği veya tam payload loglanmaz.

(Eski `data_export` tipi kullanımdan kalktı; raporlama sorgularını `EXPORT` ile güncelleyin.)

## Saklama (isteğe bağlı)

`purgeAuditEventsOlderThan` (`operational-audit-service`) ile eski `AuditEvent` kayıtları silinebilir; cron / operasyon işi olarak planlanmalıdır.

## Oran sınırı

Dışa aktarım uçları dakikada 15 istek ile sınırlıdır (genel API limitine ek).
