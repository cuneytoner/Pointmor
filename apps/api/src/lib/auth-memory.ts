/**
 * Admin oturumları: geliştirmede bellek içi; production’da varsayılan olarak HMAC imzalı (stateless).
 * Çoklu instance için iptal ve replay: `security-state` (Redis veya bellek) ile hizalanır.
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

export async function getSession(token: string | undefined): Promise<SessionPayload | null> {
  return useSignedSessions()
    ? await signedGetSession(token)
    : inMemoryGetSession(token);
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (useSignedSessions()) {
    await signedRevokeSession(token);
  } else {
    inMemoryRevokeSession(token);
  }
}
