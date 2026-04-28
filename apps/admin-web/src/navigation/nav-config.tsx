import type { FC, SVGProps } from "react";
import {
  IconBuilding,
  IconCredit,
  IconDashboard,
  IconGift,
  IconGrowth,
  IconLayers,
  IconMenu,
  IconShield,
  IconUsers,
  IconSettings,
  IconVisit,
} from "../components/nav-icons";

export type NavItemConfig = {
  to: string;
  labelKey: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  /** Platform Console öğesi */
  platform?: boolean;
  /** Tenant App öğesi */
  tenant?: boolean;
  end?: boolean;
  /** Sidebar’da aktif: `pathname` bu prefix ile başlıyorsa (iç içe rotalar) */
  navActivePrefix?: string;
};

export const PLATFORM_NAV: NavItemConfig[] = [
  {
    to: "/platform/dashboard",
    labelKey: "nav.platformDashboard",
    Icon: IconDashboard,
    platform: true,
    end: true,
  },
  {
    to: "/platform/organizations",
    labelKey: "nav.workspaces",
    Icon: IconBuilding,
    platform: true,
  },
  {
    to: "/platform/products",
    labelKey: "nav.products",
    Icon: IconLayers,
    platform: true,
  },
  {
    to: "/platform/users",
    labelKey: "nav.usersGlobal",
    Icon: IconUsers,
    platform: true,
  },
  {
    to: "/platform/subscriptions",
    labelKey: "nav.billing",
    Icon: IconCredit,
    platform: true,
  },
  {
    to: "/platform/admin",
    labelKey: "nav.platformAdmin",
    Icon: IconShield,
    platform: true,
  },
];

export const TENANT_NAV: NavItemConfig[] = [
  {
    to: "/app/dashboard",
    labelKey: "tenantLoyalty.nav.dashboard",
    Icon: IconDashboard,
    tenant: true,
    end: true,
  },
  {
    to: "/app/hq",
    labelKey: "tenantLoyalty.nav.hq",
    Icon: IconBuilding,
    tenant: true,
    navActivePrefix: "/app/hq",
  },
  {
    to: "/app/audit",
    labelKey: "tenantLoyalty.nav.audit",
    Icon: IconShield,
    tenant: true,
    navActivePrefix: "/app/audit",
  },
  {
    to: "/app/growth",
    labelKey: "tenantLoyalty.nav.growth",
    Icon: IconGrowth,
    tenant: true,
  },
  {
    to: "/app/customers",
    labelKey: "tenantLoyalty.nav.customers",
    Icon: IconUsers,
    tenant: true,
  },
  {
    to: "/app/visits",
    labelKey: "tenantLoyalty.nav.visits",
    Icon: IconVisit,
    tenant: true,
  },
  {
    to: "/app/rewards",
    labelKey: "tenantLoyalty.nav.rewards",
    Icon: IconGift,
    tenant: true,
  },
  {
    to: "/app/campaigns",
    labelKey: "tenantLoyalty.nav.campaigns",
    Icon: IconLayers,
    tenant: true,
  },
  {
    to: "/app/menu",
    labelKey: "tenantLoyalty.nav.menu",
    Icon: IconMenu,
    tenant: true,
  },
  {
    to: "/app/ai-act",
    labelKey: "tenantLoyalty.nav.aiAct",
    Icon: IconShield,
    tenant: true,
    navActivePrefix: "/app/ai-act",
  },
  {
    to: "/app/redemptions",
    labelKey: "tenantLoyalty.nav.redemptions",
    Icon: IconCredit,
    tenant: true,
  },
  {
    to: "/app/admin",
    labelKey: "nav.workspaceAdmin",
    Icon: IconSettings,
    tenant: true,
    navActivePrefix: "/app/admin",
  },
];
