import { useEffect, useState, useCallback } from "react";
import { buildAuthHeaders, getApiBaseUrl } from "../lib/api-base";
import type { AiComplianceOperationsFullDto } from "./useAdminData";

export type AiComplianceOperationsPayload = {
  aiCompliance: AiComplianceOperationsFullDto;
};

// Type for bootstrap fallback (counts-only)
type AiComplianceCountsOnly = Omit<AiComplianceOperationsFullDto, "systems">;

export type AiComplianceOperationsState = {
  loading: boolean;
  error: string | null;
  data: AiComplianceOperationsPayload | null;
  /** Timestamp of last successful fetch */
  lastFetchedAt: number | null;
};

/**
 * Fetches AI Compliance operational data from the dedicated product endpoint.
 *
 * This hook provides a thin slice migration path from bootstrap/moduleOperations
 * to product-specific endpoints. It includes a temporary fallback to bootstrap
 * data for backward compatibility during migration.
 *
 * Security note: This hook does not hide backend errors. Access denied and
 * module_not_active errors are surfaced to the caller.
 *
 * TODO(platform-api): Remove bootstrap fallback once all dependent paths are
 * migrated to this endpoint. See docs/10-meta-005-platform-project-plan.md
 */
export function useAiComplianceOperations(
  token: string | null,
  refreshKey: number,
): AiComplianceOperationsState & { refetch: () => void } {
  const [state, setState] = useState<AiComplianceOperationsState>({
    loading: false,
    error: null,
    data: null,
    lastFetchedAt: null,
  });

  const refetch = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));

    const base = getApiBaseUrl();
    const headers = buildAuthHeaders(token);

    fetch(`${base}/admin/products/ai-compliance/operations`, {
      headers,
      credentials: "include",
    })
      .then(async (res) => {
        if (res.status === 401) {
          throw new Error("unauthorized");
        }
        if (res.status === 403) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "permission_denied");
        }
        if (!res.ok) {
          throw new Error("fetch_failed");
        }
        const data = (await res.json()) as AiComplianceOperationsPayload;
        setState({
          loading: false,
          error: null,
          data,
          lastFetchedAt: Date.now(),
        });
      })
      .catch((err) => {
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "unknown_error",
          data: null,
          lastFetchedAt: null,
        });
      });
  }, [token]);

  useEffect(() => {
    refetch();
  }, [refetch, refreshKey]);

  return { ...state, refetch };
}

/**
 * Temporary fallback helper for migration compatibility.
 *
 * Returns bootstrap counts if available, with a deprecation warning in dev mode.
 * Does not hide access errors - only used when the new endpoint is not yet
 * available or during gradual rollout.
 *
 * @deprecated Use useAiComplianceOperations for new code. Remove after migration.
 */
export function getAiComplianceOperationsFallback(
  bootstrapData: { moduleOperations?: { aiCompliance?: any } } | null,
): { aiCompliance: AiComplianceCountsOnly } | null {
  if (!bootstrapData?.moduleOperations?.aiCompliance) {
    return null;
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(
      "[DEPRECATED] Using bootstrap fallback for AI Compliance operations. " +
        "Migrate to useAiComplianceOperations hook.",
    );
  }

  // Return counts-only bootstrap data
  // Systems are no longer available in bootstrap - use dedicated endpoint
  const { systems: _, ...countsOnly } = bootstrapData.moduleOperations.aiCompliance as any;
  return { 
    aiCompliance: countsOnly
  };
}
