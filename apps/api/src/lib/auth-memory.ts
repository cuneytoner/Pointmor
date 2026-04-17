import { randomUUID } from "node:crypto";

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
  role: string;
  branchScope?: SessionBranchScope;
};

export type SessionPayload = {
  user: SessionUser;
  tenant: SessionTenant | null;
  membership: SessionMembership | null;
};

const sessions = new Map<string, SessionPayload>();

export function issueSession(payload: SessionPayload): string {
  const token = randomUUID();
  sessions.set(token, payload);
  return token;
}

export function getSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function revokeSession(token: string | undefined): void {
  if (!token) return;
  sessions.delete(token);
}
