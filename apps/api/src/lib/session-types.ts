/** Admin / staff oturum yükü — imzalı veya bellek içi backend ile taşınır. */

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  platformAdmin: boolean;
};

export type SessionTenant = {
  id: string;
  slug: string;
  name: string;
};

/** Çoklu lokasyon: `all` veya şube id listesi (staff / atanmış manager). */
export type SessionBranchScope =
  | "all"
  | { restrictedTo: string[] };

export type SessionMembership = {
  tenantId?: string;
  role: string;
  isExternal?: boolean;
  branchScope?: SessionBranchScope;
};

export type SessionTenantMembership = {
  tenant: SessionTenant;
  membership: SessionMembership;
};

export type SessionPayload = {
  user: SessionUser;
  tenant: SessionTenant | null;
  membership: SessionMembership | null;
  memberships?: SessionTenantMembership[];
};
