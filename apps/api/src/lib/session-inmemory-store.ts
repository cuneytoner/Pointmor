import { randomUUID } from "node:crypto";
import type { SessionPayload } from "./session-types.js";

const sessions = new Map<string, SessionPayload>();

export function inMemoryIssueSession(payload: SessionPayload): string {
  const token = randomUUID();
  sessions.set(token, payload);
  return token;
}

export function inMemoryGetSession(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  return sessions.get(token) ?? null;
}

export function inMemoryRevokeSession(token: string | undefined): void {
  if (!token) return;
  sessions.delete(token);
}
