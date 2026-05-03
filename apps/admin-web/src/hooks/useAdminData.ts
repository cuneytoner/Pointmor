import { useEffect, useState } from "react";
import type { LocaleCode } from "../i18n/locale";
import { getApiBaseUrl } from "../lib/api-base";
import type { EntitlementsPayload } from "../lib/entitlements-api";

const cookiesOnlyAdminSession =
  import.meta.env.VITE_ADMIN_SESSION_COOKIES_ONLY !== "false";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  platformAdmin: boolean;
};

export type AuthTenant = {
  id: string;
  slug: string;
  name: string;
} | null;

export type AuthMembership = {
  role: string;
  /** API oturumu — çoklu lokasyon kapsamı */
  branchScope?: "all" | { restrictedTo: string[] };
} | null;

export type ActivationMilestones = {
  scanCompleted: boolean;
  insightViewed: boolean;
  actionTaken: boolean;
  activated: boolean;
  activatedAt: string | null;
};

export type AdminAuth = {
  user: AuthUser;
  tenant: AuthTenant;
  membership: AuthMembership;
  activation?: ActivationMilestones | null;
};

export type TenantDto = {
  id: string;
  slug: string;
  name: string;
  type?: string;
  createdAt?: string;
  /** 1–5 = adım, 6 = tamamlandı */
  onboardingStep?: number;
  onboardingCompletedAt?: string | null;
};

export type PlanDto = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  interval: string;
  featureTags: string[];
  /** API şeması: free | pro | team */
  planType?: string;
};

export type SubscriptionDto = {
  id: string;
  status: string;
  renewsAt: string | null;
  plan: PlanDto;
  tenant: TenantDto;
};

export type UserListDto = {
  id: string;
  email: string;
  name: string;
  platformAdmin: boolean;
  role: string;
  tenantId: string | null;
  tenant: { slug: string; name: string } | null;
  memberships?: Array<{ role: string; tenant: { slug: string; name: string } }>;
  createdAt?: string;
};

export type AuditLogDto = {
  id: string;
  actorEmail: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
};

export type TenantModuleDto = {
  tenantId: string;
  isActive: boolean;
  module: { name: string };
};

export type PlatformMetricsDto = {
  activeProducts: number;
  aiSystemsMonitored: number;
  advisorLinkedClients: number;
  activeLoyaltyCampaigns: number;
};

export type ModuleOperationsDto = {
  aiCompliance: {
    activeOrganizations: number;
    assessmentsCompleted: number;
    pendingReviews: number;
    openObligations: number;
    systemsNeedingReview: number;
    overdueObligations: number;
    escalatedAssessments: number;
    advisorWorkload: number;
    evidenceBacklog: number;
    // Systems array removed - use dedicated endpoint for operational systems
    // See GET /admin/products/ai-compliance/operations and useAiComplianceOperations hook
  };
  loyalty: {
    activeOrganizations: number;
    activeCampaigns: number;
    enrolledCustomers: number;
    campaignActivity: number;
  };
  advisorPortal: {
    advisorOrganizations: number;
    linkedClientOrganizations: number;
    pendingAdvisorActions: number;
    sharedWorkspaceActivity: number;
  };
};

// Full AI Compliance operations type with systems (for dedicated endpoint)
export type AiComplianceOperationsFullDto = {
  activeOrganizations: number;
  assessmentsCompleted: number;
  pendingReviews: number;
  openObligations: number;
  systemsNeedingReview: number;
  overdueObligations: number;
  escalatedAssessments: number;
  advisorWorkload: number;
  evidenceBacklog: number;
  systems: Array<{
    id: string;
    name: string;
    purpose: string | null;
    providerType: string;
    status: string;
    updatedAt: string;
    tenant: { id: string; name: string; slug: string; type: string | null };
    createdBy: { id: string; name: string | null; email: string } | null;
    currentAssessment: {
      id: string;
      status: string;
      riskLevel: string | null;
      createdAt: string;
      updatedAt: string;
      createdBy: { id: string; name: string | null; email: string } | null;
    } | null;
    obligations: Array<{
      id: string;
      obligationType: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      createdAt: string;
      updatedAt: string;
      assignedTo: { id: string; name: string | null; email: string } | null;
    }>;
    evidencesCount: number;
    operationalEvents: Array<{
      id: string;
      eventType: string;
      severity: string;
      sourceLabel: string;
      message: string;
      createdAt: string;
      actor: { id: string; name: string | null; email: string } | null;
      relatedObjectType?: "assessment" | "obligation" | "task" | "ai_system";
    }>;
  }>;
};

export type AdminBootstrap = {
  user: AuthUser;
  tenant: AuthTenant;
  membership: AuthMembership;
  tenants: TenantDto[];
  users: UserListDto[];
  plans: PlanDto[];
  subscriptions: SubscriptionDto[];
  tenantModules: TenantModuleDto[];
  platformMetrics: PlatformMetricsDto;
  // TODO(platform-api): /admin/bootstrap payload is growing too broad.
  // moduleOperations is being migrated to product-specific endpoints:
  // - GET /admin/products/ai-compliance/operations (see useAiComplianceOperations hook)
  // This field is preserved for backward compatibility during migration.
  // Do not expand; add new product data to dedicated endpoints.
  moduleOperations: ModuleOperationsDto;
  auditLogs: AuditLogDto[];
  /** `/tenant/entitlements` — yalnızca tenant oturumunda doldurulur. */
  entitlements: EntitlementsPayload | null;
};

export type AdminDataState = {
  loading: boolean;
  authInvalid: boolean;
  auth: AdminAuth | null;
  bootstrap: AdminBootstrap | null;
};

export function useAdminData(
  token: string | null,
  refreshKey: number,
  _locale: LocaleCode,
): AdminDataState {
  const [state, setState] = useState<AdminDataState>({
    loading: false,
    authInvalid: false,
    auth: null,
    bootstrap: null,
  });

  useEffect(() => {
    const t = token?.trim() ?? "";
    if (!cookiesOnlyAdminSession && !t) {
      setState({
        loading: false,
        authInvalid: false,
        auth: null,
        bootstrap: null,
      });
      return;
    }

    let cancelled = false;
    setState((s) => ({
      ...s,
      loading: true,
      authInvalid: false,
    }));

    const base = getApiBaseUrl();
    const headers = t ? ({ Authorization: `Bearer ${t}` } as const) : undefined;

    (async () => {
      try {
        const meRes = await fetch(`${base}/auth/me`, {
          headers,
          credentials: "include",
        });
        if (meRes.status === 401 || meRes.status === 403) {
          if (!cancelled) {
            setState({
              loading: false,
              authInvalid: true,
              auth: null,
              bootstrap: null,
            });
          }
          return;
        }
        if (!meRes.ok) throw new Error("me_failed");

        const me = (await meRes.json()) as {
          user: AuthUser;
          tenant: AuthTenant;
          membership: AuthMembership;
          activation?: ActivationMilestones | null;
        };

        const [bootRes, entRes] = await Promise.all([
          fetch(`${base}/admin/bootstrap`, {
            headers,
            credentials: "include",
          }),
          me.tenant
            ? fetch(`${base}/tenant/entitlements`, {
                headers,
                credentials: "include",
              })
            : Promise.resolve(null),
        ]);

        const rawBoot = bootRes.ok ? ((await bootRes.json()) as Omit<AdminBootstrap, "entitlements">) : null;
        let entitlements: EntitlementsPayload | null = null;
        if (me.tenant && entRes?.ok) {
          try {
            entitlements = (await entRes.json()) as EntitlementsPayload;
          } catch {
            entitlements = null;
          }
        }
        const bootstrap: AdminBootstrap | null = rawBoot
          ? { ...rawBoot, entitlements }
          : null;

        if (!cancelled) {
          setState({
            loading: false,
            authInvalid: false,
            auth: {
              user: me.user,
              tenant: me.tenant,
              membership: me.membership,
              activation: me.activation ?? null,
            },
            bootstrap,
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            loading: false,
            authInvalid: true,
            auth: null,
            bootstrap: null,
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, refreshKey, _locale]);

  return state;
}
