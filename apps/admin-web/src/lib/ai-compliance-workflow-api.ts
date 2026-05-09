import { buildAuthHeaders, getApiBaseUrl, type ApiAuthToken } from "./api-base";

async function workflowPost<T>(
  token: ApiAuthToken,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      ...(buildAuthHeaders(token) ?? {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (res.status === 401 || res.status === 403) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw Object.assign(new Error(payload.error ?? "auth"), { status: res.status });
  }
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw Object.assign(new Error(payload.error ?? "api_error"), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export function completeAiComplianceTask(token: ApiAuthToken, taskId: string) {
  return workflowPost<{ ok: boolean }>(
    token,
    `/admin/products/ai-compliance/tasks/${encodeURIComponent(taskId)}/complete`,
  );
}

export function reviewAiComplianceObligation(token: ApiAuthToken, obligationId: string) {
  return workflowPost<{ ok: boolean }>(
    token,
    `/admin/products/ai-compliance/obligations/${encodeURIComponent(obligationId)}/review`,
  );
}

export function reopenAiComplianceAssessment(token: ApiAuthToken, assessmentId: string) {
  return workflowPost<{ ok: boolean }>(
    token,
    `/admin/products/ai-compliance/assessments/${encodeURIComponent(assessmentId)}/reopen`,
  );
}

export function assignAiComplianceReviewer(
  token: ApiAuthToken,
  assessmentId: string,
  userId: string,
) {
  return workflowPost<{ ok: boolean }>(
    token,
    `/admin/products/ai-compliance/assessments/${encodeURIComponent(assessmentId)}/assign-reviewer`,
    { userId },
  );
}
