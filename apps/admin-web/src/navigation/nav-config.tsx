import type { FC, SVGProps } from "react";
import {
  IconBuilding,
  IconCredit,
  IconDashboard,
  IconGift,
  IconGrowth,
  IconLayers,
  IconShield,
  IconUsers,
  IconSettings,
  IconVisit,
} from "../components/nav-icons";

/** Placeholder ikon — faturalama */
function IconInvoice(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

export type NavItemConfig = {
  to: string;
  labelKey: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  /** Platform Console öğesi */
  platform?: boolean;
  /** Tenant App öğesi */
  tenant?: boolean;
  end?: boolean;
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
    to: "/platform/workspaces",
    labelKey: "nav.workspaces",
    Icon: IconBuilding,
    platform: true,
  },
  {
    to: "/platform/users",
    labelKey: "nav.usersGlobal",
    Icon: IconUsers,
    platform: true,
  },
  {
    to: "/platform/plans",
    labelKey: "nav.plans",
    Icon: IconLayers,
    platform: true,
  },
  {
    to: "/platform/subscriptions",
    labelKey: "nav.subscriptions",
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
    to: "/app/redemptions",
    labelKey: "tenantLoyalty.nav.redemptions",
    Icon: IconCredit,
    tenant: true,
  },
  {
    to: "/app/billing",
    labelKey: "nav.billing",
    Icon: IconInvoice,
    tenant: true,
  },
  {
    to: "/app/settings",
    labelKey: "nav.tenantSettings",
    Icon: IconSettings,
    tenant: true,
  },
];
