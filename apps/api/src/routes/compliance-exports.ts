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
import { buildAuditCsv, renderPdfDocument } from "../lib/export-format.js";
import {
  anonymizeCustomer,
  buildCustomerGdprExport,
} from "../lib/gdpr-customer-service.js";
import {
  assertFeature,
  FEATURE,
  getTenantEntitlementContext,
} from "../lib/entitlement-service.js";
import { prisma } from "../lib/prisma.js";
import { AuditEntityType } from "../generated/prisma/client.js";
import {
  summarizePayloadForCsv,
  summarizePayloadForPdfLine,
} from "../lib/export-redaction.js";

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
      const lines = [
        `Pointmor — Audit özeti (redakte)`,
        `Workspace: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`,
        `Üretim: ${new Date().toISOString()}`,
        "",
        ...rows.map(
          (r) =>
            `${r.createdAt} | ${r.eventType} | ${r.entityType} ${r.entityId} | aktör ${r.actorType} | ${summarizePayloadForPdfLine(r.payload)}`,
        ),
      ];
      const buf = await renderPdfDocument(lines);
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
      Querystring: { period?: string };
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
      const mode = req.query.period === "week" ? "week" : "day";
      const summary = await getLoyaltySummaryForWindow(tenantId, mode);
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, slug: true },
      });
      const lines = [
        `Pointmor — Operasyon özeti (yönetici / kapanış özeti)`,
        `Workspace: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`,
        `Dönem: ${summary.periodLabel}`,
        `Pencere: ${summary.windowStart} — ${summary.windowEnd}`,
        `Toplam müşteri: ${summary.totalCustomers}`,
        `Ziyaret (pencere): ${summary.visitsInWindow}`,
        `Verilen puan (pencere): ${summary.pointsIssuedInWindow}`,
        `Tamamlanan ödül kullanımı (pencere): ${summary.redemptionsInWindow}`,
        `Çalışır kampanya (şu an): ${summary.activeCampaigns}`,
      ];
      const buf = await renderPdfDocument(lines);
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
      try {
        const ent = await getTenantEntitlementContext(tenantId);
        assertFeature(ent, FEATURE.MANAGER_CLOSING);
      } catch (e) {
        const er = e as Error & { code?: string; feature?: string };
        if (er.code === "plan_feature_disabled") {
          return reply.code(403).send({ error: er.code, feature: er.feature });
        }
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
      const lines = [
        `Pointmor — Anomali raporu (redakte özet)`,
        `Workspace: ${tenant?.name ?? tenantId} (${tenant?.slug ?? ""})`,
        `Üretim: ${new Date().toISOString()}`,
        "",
        ...rows.map((r) => {
          const cid = r.customerId ? `müşteri …${r.customerId.slice(-6)}` : "müşteri —";
          return `${r.createdAt} | ${r.type} | ${r.severity} | ${cid} | ${summarizePayloadForPdfLine(r.payload)}`;
        }),
      ];
      const buf = await renderPdfDocument(lines);
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
