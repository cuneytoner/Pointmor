import type { FastifyInstance } from "fastify";
import type { SessionPayload } from "../lib/auth-memory.js";
import { authPreHandler } from "../lib/http-auth.js";
import { requireTenantPermission } from "../lib/tenant-permission-guard.js";
import {
  queryAuditEventsForExport,
  recordDataExportEvent,
} from "../lib/operational-audit-service.js";
import { listAnomalySignalsForExport } from "../lib/operational-anomaly-service.js";
import { getLoyaltySummaryForWindow } from "../lib/loyalty-service.js";
import { buildAuditCsv, renderPdfReport } from "../lib/export-format.js";
import {
  anonymizeCustomer,
  buildCustomerGdprExport,
} from "../lib/gdpr-customer-service.js";
import {
  assertComplianceFull,
  assertComplianceLimited,
  getTenantEntitlementContext,
  sendEntitlementHttpError,
} from "../lib/entitlement-service.js";
import { prisma } from "../lib/prisma.js";
import { AuditEntityType } from "../generated/prisma/client.js";
import {
  summarizePayloadForCsv,
  summarizePayloadForPdfLine,
} from "../lib/export-redaction.js";
import { formatCountForLocale, formatPointsForLocale } from "../lib/number-format.js";

function requireTenantId(
  req: { authSession?: SessionPayload },
  reply: { code: (n: number) => { send: (b: unknown) => unknown } },
): string | null {
  const s = req.authSession as SessionPayload | undefined;
  const id = s?.tenant?.id;
  if (!id) {
    reply.code(403).send({ error: "tenant_context_required" });
    return null;
  }
  return id;
}

function parseIsoDate(v: unknown): Date | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const d = new Date(v.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseEntityType(v: unknown): (typeof AuditEntityType)[keyof typeof AuditEntityType] | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  const raw = v.trim();
  return Object.values(AuditEntityType).includes(raw as never)
    ? (raw as (typeof AuditEntityType)[keyof typeof AuditEntityType])
    : undefined;
}

type ReportLocale = "tr" | "es" | "de" | "en";

type PdfTextPack = {
  workspaceLabel: string;
  producedLabel: string;
  recordCountLabel: string;
  periodLabel: string;
  dateRangeLabel: string;
  customerLabel: string;
  summaryMetricLabel: string;
  summaryValueLabel: string;
  summaryTitle: string;
  auditTitle: string;
  anomalyTitle: string;
  summaryTotalCustomers: string;
  summaryVisitsInRange: string;
  summaryPointsInRange: string;
  summaryRedemptionsInRange: string;
  summaryActiveCampaigns: string;
  auditHeaders: [string, string, string, string, string];
  anomalyHeaders: [string, string, string, string, string];
  periodUtcToday: string;
  periodRolling7dUtc: string;
};

const PDF_LOCALE_TAG: Record<ReportLocale, string> = {
  tr: "tr-TR",
  es: "es-ES",
  de: "de-DE",
  en: "en-US",
};

const PDF_TEXT: Record<ReportLocale, PdfTextPack> = {
  tr: {
    workspaceLabel: "İşletme",
    producedLabel: "Üretim",
    recordCountLabel: "Kayıt sayısı",
    periodLabel: "Dönem",
    dateRangeLabel: "Zaman aralığı",
    customerLabel: "müşteri",
    summaryMetricLabel: "Metrik",
    summaryValueLabel: "Değer",
    summaryTitle: "Pointmor — Operasyon özeti (yönetici / kapanış özeti)",
    auditTitle: "Pointmor — Denetim özeti (redakte)",
    anomalyTitle: "Pointmor — Anomali raporu (redakte özet)",
    summaryTotalCustomers: "Toplam müşteri",
    summaryVisitsInRange: "Ziyaret (zaman aralığı)",
    summaryPointsInRange: "Verilen puan (zaman aralığı)",
    summaryRedemptionsInRange: "Tamamlanan ödül kullanımı (zaman aralığı)",
    summaryActiveCampaigns: "Aktif kampanyalar (şu an)",
    auditHeaders: ["Tarih", "Olay", "Varlık", "Aktör", "Özet"],
    anomalyHeaders: ["Tarih", "Tür", "Seviye", "Müşteri", "Özet"],
    periodUtcToday: "Bugün (UTC)",
    periodRolling7dUtc: "Son 7 gün (UTC)",
  },
  es: {
    workspaceLabel: "Negocio",
    producedLabel: "Generado",
    recordCountLabel: "Total de registros",
    periodLabel: "Periodo",
    dateRangeLabel: "Rango de fechas",
    customerLabel: "cliente",
    summaryMetricLabel: "Métrica",
    summaryValueLabel: "Valor",
    summaryTitle: "Pointmor — Resumen operativo (cierre de gerente)",
    auditTitle: "Pointmor — Resumen de auditoría (redactado)",
    anomalyTitle: "Pointmor — Informe de anomalías (resumen redactado)",
    summaryTotalCustomers: "Clientes totales",
    summaryVisitsInRange: "Visitas (rango de fechas)",
    summaryPointsInRange: "Puntos emitidos (rango de fechas)",
    summaryRedemptionsInRange: "Canjes completados (rango de fechas)",
    summaryActiveCampaigns: "Campañas activas (ahora)",
    auditHeaders: ["Fecha", "Evento", "Entidad", "Actor", "Resumen"],
    anomalyHeaders: ["Fecha", "Tipo", "Severidad", "Cliente", "Resumen"],
    periodUtcToday: "Hoy (UTC)",
    periodRolling7dUtc: "Últimos 7 días (UTC)",
  },
  de: {
    workspaceLabel: "Betrieb",
    producedLabel: "Erstellt",
    recordCountLabel: "Anzahl Einträge",
    periodLabel: "Zeitraum",
    dateRangeLabel: "Datumsbereich",
    customerLabel: "Kunde",
    summaryMetricLabel: "Kennzahl",
    summaryValueLabel: "Wert",
    summaryTitle: "Pointmor — Betriebsübersicht (Manager-Abschluss)",
    auditTitle: "Pointmor — Audit-Zusammenfassung (redigiert)",
    anomalyTitle: "Pointmor — Anomaliebericht (redigierte Zusammenfassung)",
    summaryTotalCustomers: "Kunden gesamt",
    summaryVisitsInRange: "Besuche (Datumsbereich)",
    summaryPointsInRange: "Gutgeschriebene Punkte (Datumsbereich)",
    summaryRedemptionsInRange: "Abgeschlossene Einlösungen (Datumsbereich)",
    summaryActiveCampaigns: "Aktive Kampagnen (aktuell)",
    auditHeaders: ["Datum", "Ereignis", "Entität", "Akteur", "Zusammenfassung"],
    anomalyHeaders: ["Datum", "Typ", "Schweregrad", "Kunde", "Zusammenfassung"],
    periodUtcToday: "Heute (UTC)",
    periodRolling7dUtc: "Letzte 7 Tage (UTC)",
  },
  en: {
    workspaceLabel: "Workspace",
    producedLabel: "Generated",
    recordCountLabel: "Row count",
    periodLabel: "Period",
    dateRangeLabel: "Date range",
    customerLabel: "customer",
    summaryMetricLabel: "Metric",
    summaryValueLabel: "Value",
    summaryTitle: "Pointmor — Operational summary (manager close-out)",
    auditTitle: "Pointmor — Audit summary (redacted)",
    anomalyTitle: "Pointmor — Anomaly report (redacted summary)",
    summaryTotalCustomers: "Total customers",
    summaryVisitsInRange: "Visits (date range)",
    summaryPointsInRange: "Points issued (date range)",
    summaryRedemptionsInRange: "Completed redemptions (date range)",
    summaryActiveCampaigns: "Active campaigns (now)",
    auditHeaders: ["Date", "Event", "Entity", "Actor", "Summary"],
    anomalyHeaders: ["Date", "Type", "Severity", "Customer", "Summary"],
    periodUtcToday: "Today (UTC)",
    periodRolling7dUtc: "Last 7 days (UTC)",
  },
};

function parseReportLocale(v: unknown): ReportLocale | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const raw = v.trim().toLowerCase();
  if (raw.startsWith("tr")) return "tr";
  if (raw.startsWith("es")) return "es";
  if (raw.startsWith("de")) return "de";
  if (raw.startsWith("en")) return "en";
  return null;
}

function resolveReportLocale(
  queryLang: unknown,
  acceptLanguageHeader: string | string[] | undefined,
): ReportLocale {
  const fromQuery = parseReportLocale(queryLang);
  if (fromQuery) return fromQuery;
  const headerRaw = Array.isArray(acceptLanguageHeader)
    ? acceptLanguageHeader[0]
    : acceptLanguageHeader;
  const fromHeader = parseReportLocale(headerRaw);
  return fromHeader ?? "tr";
}

function formatIsoUtcDate(iso: string, locale: ReportLocale): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const fmt = new Intl.DateTimeFormat(PDF_LOCALE_TAG[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return fmt.format(d);
}

function formatIsoUtcDateTime(iso: string, locale: ReportLocale): string {
  const d = parseIsoDate(iso);
  if (!d) return iso;
  const fmt = new Intl.DateTimeFormat(PDF_LOCALE_TAG[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  });
  return `${fmt.format(d)} UTC`;
}

function formatSummaryPeriodLabel(periodLabel: string, locale: ReportLocale): string {
  const t = PDF_TEXT[locale];
  if (periodLabel === "utc_today") return t.periodUtcToday;
  if (periodLabel === "rolling_7d_utc") return t.periodRolling7dUtc;
  return periodLabel;
}

function formatSummaryWindow(startIso: string, endIso: string, locale: ReportLocale): string {
  return `${formatIsoUtcDate(startIso, locale)} — ${formatIsoUtcDate(endIso, locale)}`;
}

function formatCountValue(value: number, locale: ReportLocale): string {
  return formatCountForLocale(value, PDF_LOCALE_TAG[locale]);
}

function formatPointsValue(value: number, locale: ReportLocale): string {
  return formatPointsForLocale(value, PDF_LOCALE_TAG[locale]);
}

const EXPORT_RATE = {
  rateLimit: {
    max: 15,
    timeWindow: "1 minute" as const,
  },
};

export async function registerComplianceExportRoutes(app: FastifyInstance): Promise<void> {
  const auditCsvPaths = ["/tenant/audit/export/csv", "/audit/export/csv"] as const;
  for (const routePath of auditCsvPaths) {
    app.get<{
      Querystring: Record<string, string | undefined>;
    }>(
      routePath,
      {
        preHandler: [authPreHandler, requireTenantPermission("audit.export")],
        config: { rateLimit: EXPORT_RATE.rateLimit },
      },
      async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceFull(ent);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const from = parseIsoDate(req.query.from);
      const to = parseIsoDate(req.query.to);
      const maxRows = req.query.maxRows ? Number.parseInt(req.query.maxRows, 10) : 5000;
      const entityType = parseEntityType(req.query.entityType);
      const entityId =
        typeof req.query.entityId === "string" && req.query.entityId.trim()
          ? req.query.entityId.trim()
          : undefined;
      const filters = {
        from: from?.toISOString(),
        to: to?.toISOString(),
        eventType: req.query.eventType,
        actorUserId: req.query.actorUserId,
        branchId: req.query.branchId,
        entityType: entityType ?? req.query.entityType,
        entityId,
        maxRows,
      };
      const rows = await queryAuditEventsForExport(tenantId, {
        maxRows: Number.isFinite(maxRows) ? maxRows : 5000,
        from,
        to,
        eventType: req.query.eventType,
        actorUserId: req.query.actorUserId,
        branchId: req.query.branchId,
        entityType,
        entityId,
      });
      const headers = [
        "id",
        "createdAt",
        "eventType",
        "entityType",
        "entityId",
        "actorType",
        "actorUserId",
        "payload_summary",
      ];
      const csvRows = rows.map((r) => {
        const o = r as Record<string, unknown>;
        return [
          String(o.id ?? ""),
          String(o.createdAt ?? ""),
          String(o.eventType ?? ""),
          String(o.entityType ?? ""),
          String(o.entityId ?? ""),
          String(o.actorType ?? ""),
          String(o.actorUserId ?? ""),
          summarizePayloadForCsv(o.payload),
        ];
      });
      const body = buildAuditCsv(headers, csvRows);
      await recordDataExportEvent({
        tenantId,
        actorUserId: s.user.id,
        kind: "audit_csv",
        exportType: "CSV",
        filters,
      });
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="audit-export.csv"')
        .send(body);
      },
    );
  }

  const auditPdfPaths = ["/tenant/audit/export/pdf", "/audit/export/pdf"] as const;
  for (const routePath of auditPdfPaths) {
    app.get<{
      Querystring: Record<string, string | undefined>;
    }>(
      routePath,
      {
        preHandler: [authPreHandler, requireTenantPermission("audit.export")],
        config: { rateLimit: EXPORT_RATE.rateLimit },
      },
      async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const locale = resolveReportLocale(req.query.lang, req.headers["accept-language"]);
      const t = PDF_TEXT[locale];
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceFull(ent);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const from = parseIsoDate(req.query.from);
      const to = parseIsoDate(req.query.to);
      const maxRows = req.query.maxRows ? Number.parseInt(req.query.maxRows, 10) : 200;
      const entityType = parseEntityType(req.query.entityType);
      const entityId =
        typeof req.query.entityId === "string" && req.query.entityId.trim()
          ? req.query.entityId.trim()
          : undefined;
      const filters = {
        from: from?.toISOString(),
        to: to?.toISOString(),
        eventType: req.query.eventType,
        actorUserId: req.query.actorUserId,
        branchId: req.query.branchId,
        entityType: entityType ?? req.query.entityType,
        entityId,
        maxRows,
      };
      const rows = await queryAuditEventsForExport(tenantId, {
        maxRows: Number.isFinite(maxRows) ? maxRows : 200,
        from,
        to,
        eventType: req.query.eventType,
        actorUserId: req.query.actorUserId,
        branchId: req.query.branchId,
        entityType,
        entityId,
      });
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });
      const tableRows = rows.map((r) => [
        formatIsoUtcDateTime(String(r.createdAt ?? ""), locale),
        String(r.eventType ?? ""),
        `${String(r.entityType ?? "")} ${String(r.entityId ?? "")}`.trim(),
        String(r.actorType ?? ""),
        summarizePayloadForPdfLine(r.payload),
      ]);
      const buf = await renderPdfReport({
        title: t.auditTitle,
        subtitleLines: [`${t.workspaceLabel}: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`],
        metaRows: [
          { label: t.producedLabel, value: formatIsoUtcDateTime(new Date().toISOString(), locale) },
          { label: t.recordCountLabel, value: formatCountValue(tableRows.length, locale) },
        ],
        table: {
          headers: t.auditHeaders,
          rows: tableRows,
          columnFractions: [1.35, 1.15, 1.45, 0.9, 2.15],
          alignments: ["left", "left", "left", "left", "left"],
        },
      });
      await recordDataExportEvent({
        tenantId,
        actorUserId: s.user.id,
        kind: "audit_pdf",
        exportType: "PDF",
        filters,
      });
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", 'attachment; filename="audit-summary.pdf"')
        .send(buf);
      },
    );
  }

  const summaryPdfPaths = ["/tenant/summary/export/pdf", "/summary/export/pdf"] as const;
  for (const routePath of summaryPdfPaths) {
    app.get<{
      Querystring: { period?: string; lang?: string };
    }>(
      routePath,
      {
        preHandler: [authPreHandler, requireTenantPermission("summary.export")],
        config: { rateLimit: EXPORT_RATE.rateLimit },
      },
      async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const locale = resolveReportLocale(req.query.lang, req.headers["accept-language"]);
      const t = PDF_TEXT[locale];
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceLimited(ent);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const mode = req.query.period === "week" ? "week" : "day";
      const summary = await getLoyaltySummaryForWindow(tenantId, mode);
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });
      const buf = await renderPdfReport({
        title: t.summaryTitle,
        subtitleLines: [`${t.workspaceLabel}: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`],
        metaRows: [
          { label: t.periodLabel, value: formatSummaryPeriodLabel(summary.periodLabel, locale) },
          {
            label: t.dateRangeLabel,
            value: formatSummaryWindow(summary.windowStart, summary.windowEnd, locale),
          },
        ],
        table: {
          headers: [t.summaryMetricLabel, t.summaryValueLabel],
          rows: [
            [t.summaryTotalCustomers, formatCountValue(summary.totalCustomers, locale)],
            [t.summaryVisitsInRange, formatCountValue(summary.visitsInWindow, locale)],
            [t.summaryPointsInRange, formatPointsValue(summary.pointsIssuedInWindow, locale)],
            [
              t.summaryRedemptionsInRange,
              formatCountValue(summary.redemptionsInWindow, locale),
            ],
            [t.summaryActiveCampaigns, formatCountValue(summary.activeCampaigns, locale)],
          ],
          columnFractions: [2.3, 1],
          alignments: ["left", "right"],
        },
      });
      const filters = { period: mode };
      await recordDataExportEvent({
        tenantId,
        actorUserId: s.user.id,
        kind: "summary_pdf",
        exportType: "PDF",
        filters,
      });
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", 'attachment; filename="loyalty-summary.pdf"')
        .send(buf);
      },
    );
  }

  const anomalyPdfPaths = ["/tenant/anomalies/export/pdf", "/anomalies/export/pdf"] as const;
  for (const routePath of anomalyPdfPaths) {
    app.get<{
      Querystring: Record<string, string | undefined>;
    }>(
      routePath,
      {
        preHandler: [authPreHandler, requireTenantPermission("anomaly.export")],
        config: { rateLimit: EXPORT_RATE.rateLimit },
      },
      async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const locale = resolveReportLocale(req.query.lang, req.headers["accept-language"]);
      const t = PDF_TEXT[locale];
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceFull(ent);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const from = parseIsoDate(req.query.from);
      const to = parseIsoDate(req.query.to);
      const maxRows = req.query.maxRows ? Number.parseInt(req.query.maxRows, 10) : 200;
      const filters = {
        from: from?.toISOString(),
        to: to?.toISOString(),
        branchId: req.query.branchId,
        maxRows,
      };
      const rows = await listAnomalySignalsForExport(tenantId, {
        maxRows: Number.isFinite(maxRows) ? maxRows : 200,
        from,
        to,
        branchId: req.query.branchId,
      });
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });
      const tableRows = rows.map((r) => {
        const cid = r.customerId
          ? `${t.customerLabel} …${r.customerId.slice(-6)}`
          : `${t.customerLabel} —`;
        return [
          formatIsoUtcDateTime(String(r.createdAt ?? ""), locale),
          String(r.type ?? ""),
          String(r.severity ?? ""),
          cid,
          summarizePayloadForPdfLine(r.payload),
        ];
      });
      const buf = await renderPdfReport({
        title: t.anomalyTitle,
        subtitleLines: [`${t.workspaceLabel}: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`],
        metaRows: [
          { label: t.producedLabel, value: formatIsoUtcDateTime(new Date().toISOString(), locale) },
          { label: t.recordCountLabel, value: formatCountValue(tableRows.length, locale) },
        ],
        table: {
          headers: t.anomalyHeaders,
          rows: tableRows,
          columnFractions: [1.35, 1.2, 0.9, 1.35, 2.2],
          alignments: ["left", "left", "left", "left", "left"],
        },
      });
      await recordDataExportEvent({
        tenantId,
        actorUserId: s.user.id,
        kind: "anomaly_pdf",
        exportType: "PDF",
        filters,
      });
      return reply
        .header("Content-Type", "application/pdf")
        .header("Content-Disposition", 'attachment; filename="anomalies.pdf"')
        .send(buf);
      },
    );
  }

  app.get<{ Params: { customerId: string } }>(
    "/tenant/customers/:customerId/gdpr-export",
    {
      preHandler: [authPreHandler, requireTenantPermission("gdpr.customer_export")],
      config: { rateLimit: EXPORT_RATE.rateLimit },
    },
    async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const customerId = req.params.customerId;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceFull(ent);
        const data = await buildCustomerGdprExport(tenantId, customerId);
        await recordDataExportEvent({
          tenantId,
          actorUserId: s.user.id,
          kind: "gdpr_customer_json",
          exportType: "JSON",
          filters: { customerId },
        });
        return reply
          .header("Content-Type", "application/json; charset=utf-8")
          .header(
            "Content-Disposition",
            `attachment; filename="customer-${customerId}-export.json"`,
          )
          .send(JSON.stringify(data, null, 2));
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        const er = e as Error & { statusCode?: number };
        if (er.statusCode === 404) return reply.code(404).send({ error: "not_found" });
        throw e;
      }
    },
  );

  app.post<{ Params: { customerId: string } }>(
    "/tenant/customers/:customerId/anonymize",
    {
      preHandler: [authPreHandler, requireTenantPermission("settings.manage")],
      config: { rateLimit: EXPORT_RATE.rateLimit },
    },
    async (req, reply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const s = req.authSession as SessionPayload;
      const customerId = req.params.customerId;
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertComplianceFull(ent);
      } catch (e) {
        if (sendEntitlementHttpError(reply, e)) return;
        throw e;
      }
      const row = await prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        select: { id: true },
      });
      if (!row) return reply.code(404).send({ error: "not_found" });
      await anonymizeCustomer({
        tenantId,
        customerId,
        actorUserId: s.user.id,
      });
      return { ok: true };
    },
  );
}
