/**
 * Admin oturumları: geliştirmede bellek içi; production’da varsayılan olarak HMAC imzalı (stateless).
 * Çoklu instance / restart sonrası çerez geçerli kalır. Çıkış (revoke) imzalı modda yalnızca süreç içi jti listesiyle sınırlıdır — tam iptal için DB/Redis tabanlı store gerekir (follow-up).
 */
export type {
  SessionBranchScope,
  SessionMembership,
  SessionPayload,
  SessionTenant,
  SessionUser,
} from "./session-types.js";

import {
  inMemoryGetSession,
  inMemoryIssueSession,
  inMemoryRevokeSession,
} from "./session-inmemory-store.js";
import {
  signedGetSession,
  signedIssueSession,
  signedRevokeSession,
  useSignedSessions,
} from "./session-signed.js";
import type { SessionPayload } from "./session-types.js";

export function issueSession(payload: SessionPayload): string {
  return useSignedSessions()
    ? signedIssueSession(payload)
    : inMemoryIssueSession(payload);
}

export function getSession(token: string | undefined): SessionPayload | null {
  return useSignedSessions()
    ? signedGetSession(token)
    : inMemoryGetSession(token);
}

export function revokeSession(token: string | undefined): void {
  if (useSignedSessions()) {
    signedRevokeSession(token);
  } else {
    inMemoryRevokeSession(token);
  }
}
