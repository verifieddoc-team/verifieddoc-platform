import { useCallback, useEffect, useState } from "react";
import { fetchVerificationResultById } from "../services/verificationResultService";

/**
 * Owns state for a single Verification Result detail screen.
 * Returns { result: object|null, loading, error, refresh }.
 */
export function useVerificationResult(id) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    result: null,
  });

  const load = useCallback(async () => {
    if (!id) {
      setState({ loading: false, error: null, result: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetchVerificationResultById(id);
      setState({ loading: false, error: null, result });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Unable to load verification result",
      }));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refresh: load };
}
