
import { useCallback, useEffect, useState } from "react";
import { fetchVerificationResults } from "../services/verificationResultService";

/**
 * Owns state for the Verification Results list screen.
 * Returns { results: Array|null, loading, error, refresh }.
 */
export function useVerificationResults() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    results: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const results = await fetchVerificationResults();
      setState({ loading: false, error: null, results: results ?? [] });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Unable to load verification results",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
