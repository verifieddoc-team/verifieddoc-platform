import { useCallback, useEffect, useState } from "react";
import { fetchDashboardData } from "../services/dashboardService";

/**
 * Owns dashboard state so presentation components stay dumb.
 *
 * Shape returned:
 * {
 *   loading: boolean,
 *   error: string | null,
 *   organization: { name: string } | null,
 *   stats: {
 *     totalCredentials: { value: number, description: string } | null,
 *     recipients: { value: number, description: string } | null,
 *     pendingVerification: { value: number, description: string } | null,
 *   },
 *   recentlyIssued: Array | null,
 *   refresh: () => void,
 * }
 *
 * NOTE: fetchDashboardData is currently a stub (see dashboardService.js) —
 * there is no dashboard API yet. Once the backend team exposes one, wire
 * the real request in that one file and this hook doesn't need to change.
 */
export function useDashboardData() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    organization: null,
    stats: {
      totalCredentials: null,
      recipients: null,
      pendingVerification: null,
    },
    recentlyIssued: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchDashboardData();
      setState({
        loading: false,
        error: null,
        organization: data?.organization ?? null,
        stats: {
          totalCredentials: data?.stats?.totalCredentials ?? null,
          recipients: data?.stats?.recipients ?? null,
          pendingVerification: data?.stats?.pendingVerification ?? null,
        },
        recentlyIssued: data?.recentlyIssued ?? [],
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Unable to load dashboard data",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
