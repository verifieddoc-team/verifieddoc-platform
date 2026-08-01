// src/hooks/useOrganisationDashboard.js
import { useCallback, useEffect, useState } from "react";
import { fetchOrganisationDashboard } from "../services/organisationService";

/**
 * Owns Organisation Portal state so presentation components stay dumb.
 *
 * Returns:
 * {
 *   organisation: { name, verificationStatus } | null,
 *   statistics: {
 *     documentsIssued: { value, trendDirection, trendValue } | null,
 *     verificationRequests: { value, trendDirection, trendValue } | null,
 *     pendingRequests: { value, trendDirection, trendValue } | null,
 *     revokedDocuments: { value, trendDirection, trendValue } | null,
 *   },
 *   recentRequests: Array | null,
 *   loading: boolean,
 *   error: string | null,
 *   refresh: () => void,
 * }
 */
export function useOrganisationDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    organisation: null,
    statistics: {
      documentsIssued: null,
      verificationRequests: null,
      pendingRequests: null,
      revokedDocuments: null,
    },
    recentRequests: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchOrganisationDashboard();
      setState({
        loading: false,
        error: null,
        organisation: data?.organisation ?? null,
        statistics: {
          documentsIssued: data?.statistics?.documentsIssued ?? null,
          verificationRequests: data?.statistics?.verificationRequests ?? null,
          pendingRequests: data?.statistics?.pendingRequests ?? null,
          revokedDocuments: data?.statistics?.revokedDocuments ?? null,
        },
        recentRequests: data?.recentRequests ?? [],
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Unable to load organisation data",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
