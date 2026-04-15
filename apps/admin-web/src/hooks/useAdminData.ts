import { useEffect, useState } from "react";
import type { LocaleCode } from "../i18n/locale";
import { getApiBaseUrl } from "../lib/api-base";
import type { EntitlementsPayload } from "../lib/entitlements-api";

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
  createdAt?: string;
};

export type AuditLogDto = {
  id: string;
  actorEmail: string | null;
  action: string;
  detail: string | null;
  createdAt: string;
};

export type AdminBootstrap = {
  user: AuthUser;
  tenant: AuthTenant;
  membership: AuthMembership;
  tenants: TenantDto[];
  users: UserListDto[];
  plans: PlanDto[];
  subscriptions: SubscriptionDto[];
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
    if (!t) {
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
    const headers = { Authorization: `Bearer ${t}` } as const;

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
