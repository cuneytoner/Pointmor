import { getApiBaseUrl } from "./api-base";
import type { AiActPurposeValue } from "./ai-act-contract";

export type AiSystem = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  purpose: string | null;
  providerType: "INTERNAL" | "EXTERNAL" | "HYBRID";
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type AiAssessmentAnswer = {
  id: string;
  questionKey: string;
  answerValue: unknown;
};

export type AiAssessmentResultPayload = {
  assessmentId: string;
  riskLevel: string | null;
  confidence: number | null;
  suggested: boolean;
};

export type AiAssessmentPayload = {
  assessment: {
    id: string;
    riskLevel: string | null;
    confidence: number | null;
  };
  answers: AiAssessmentAnswer[];
  risk: { riskLevel: string; score: number; rationale: string } | null;
  suggested: boolean;
};

export type AiObligation = {
  id: string;
  obligationType: string;
  status: string;
  source: string;
};

export type AiTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
};

type ApiError = Error & { status?: number; code?: string };

async function aiActFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const authHeader = token?.trim() ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...authHeader,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
  });
  if (!res.ok) {
    let code = "api_error";
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) code = body.error;
    } catch {
      // noop
    }
    const err = Object.assign(new Error(code), { status: res.status, code }) as ApiError;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function getAiSystems(token: string) {
  return aiActFetch<AiSystem[]>(token, "/ai-act/systems");
}

export function getAiSystem(token: string, id: string) {
  return aiActFetch<AiSystem>(token, `/ai-act/systems/${encodeURIComponent(id)}`);
}

export function createAiSystem(
  token: string,
  body: { name: string; purpose?: string; providerType: "INTERNAL" | "EXTERNAL" | "HYBRID" },
) {
  return aiActFetch<AiSystem>(token, "/ai-act/systems", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function submitAiAssessment(
  token: string,
  systemId: string,
  answers: Record<string, boolean | AiActPurposeValue>,
) {
  return aiActFetch<AiAssessmentResultPayload>(
    token,
    `/ai-act/systems/${encodeURIComponent(systemId)}/assessment`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    },
  );
}

export function getAiAssessment(token: string, systemId: string) {
  return aiActFetch<AiAssessmentPayload>(token, `/ai-act/systems/${encodeURIComponent(systemId)}/assessment`);
}

export function getAiObligations(token: string, systemId: string) {
  return aiActFetch<AiObligation[]>(token, `/ai-act/systems/${encodeURIComponent(systemId)}/obligations`);
}

export function getAiTasks(token: string, systemId: string) {
  return aiActFetch<AiTask[]>(token, `/ai-act/systems/${encodeURIComponent(systemId)}/tasks`);
}
