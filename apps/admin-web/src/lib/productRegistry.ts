import type { TenantPermission } from "./tenant-permissions";

export type ProductKey = "loyalty" | "ai_act" | "advisor_portal";

export type ProductPermissions = {
  view?: TenantPermission;
  assess?: TenantPermission;
  manage?: TenantPermission;
};

export type ProductDefinition = {
  key: ProductKey;
  label: string;
  moduleName: string;
  routes: string[];
  navItems: string[];
  permissions: ProductPermissions;
  permissionRoutes?: Array<{
    match: (pathname: string) => boolean;
    permission: TenantPermission;
  }>;
  landingPath: string;
};

export const PRODUCT_REGISTRY: Record<ProductKey, ProductDefinition> = {
  loyalty: {
    key: "loyalty",
    label: "Loyalty",
    moduleName: "cafe",
    routes: [
      "/app/customers",
      "/app/visits",
      "/app/rewards",
      "/app/campaigns",
      "/app/menu",
      "/app/redemptions",
    ],
    navItems: [
      "/app/customers",
      "/app/visits",
      "/app/rewards",
      "/app/campaigns",
      "/app/menu",
      "/app/redemptions",
    ],
    permissions: {
      view: "customers.view",
      manage: "campaigns.manage",
    },
    landingPath: "/app/customers",
  },
  ai_act: {
    key: "ai_act",
    label: "AI Act",
    moduleName: "ai_act",
    routes: ["/app/ai-act"],
    navItems: ["/app/ai-act"],
    permissions: {
      view: "ai_act.view",
      assess: "ai_act.assess",
      manage: "ai_act.manage",
    },
    permissionRoutes: [
      {
        match: (pathname) => pathname === "/app/ai-act/new",
        permission: "ai_act.manage",
      },
      {
        match: (pathname) =>
          pathname.startsWith("/app/ai-act/") && pathname.endsWith("/assessment"),
        permission: "ai_act.assess",
      },
      {
        match: (pathname) => pathname.startsWith("/app/ai-act"),
        permission: "ai_act.view",
      },
    ],
    landingPath: "/app/ai-act",
  },
  advisor_portal: {
    key: "advisor_portal",
    label: "Advisor Portal",
    moduleName: "advisor_portal",
    routes: ["/app/dashboard"],
    navItems: [],
    permissions: {
      view: "analytics.view",
    },
    landingPath: "/app/dashboard",
  },
};

export function matchesProductRoute(pathname: string, key: ProductKey): boolean {
  return PRODUCT_REGISTRY[key].routes.some((prefix) => pathname.startsWith(prefix));
}

export function isProductNavTarget(pathname: string, key: ProductKey): boolean {
  return PRODUCT_REGISTRY[key].navItems.some((prefix) => pathname.startsWith(prefix));
}

export function permissionForProductPath(
  pathname: string,
  key: ProductKey,
): TenantPermission | null {
  const route = PRODUCT_REGISTRY[key].permissionRoutes?.find((entry) => entry.match(pathname));
  return route?.permission ?? null;
}

