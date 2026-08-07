import { useCallback, useEffect, useState } from "react";
import { fetchVerifierDashboard, verifyCredential } from "../services/verifierService";

/**
 * Owns Verifier dashboard state so presentation components stay dumb.
 *
 * Returns:
 * {
 *   stats: {
 *     total: { value, description } | null,
 *     verified: { value, description } | null,
 *     failedVerifications: { value, description } | null,
 *   },
 *   recentVerifications: Array | null,
 *   loading: boolean,
 *   error: string | null,
 *   refresh: () => void,
 *   verify: (credentialId: string) => Promise<void>,
 *   verifying: boolean,
 *   verifyError: string | null,
 * }
 */
export function useVerifierDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    stats: {
      total: null,
      verified: null,
      failedVerifications: null,
    },
    recentVerifications: null,
  });

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState(null);
const [verificationResult, setVerificationResult] = useState(null);
  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchVerifierDashboard();
      setState({
        loading: false,
        error: null,
        stats: {
          total: data?.stats?.total ?? null,
          verified: data?.stats?.verified ?? null,
          failedVerifications: data?.stats?.failedVerifications ?? null,
        },
        recentVerifications: data?.recentVerifications ?? [],
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? "Unable to load verifier dashboard",
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verify = useCallback(
  async (input) => {
    setVerifying(true);
    setVerifyError(null);
    setVerificationResult(null);

    try {
      const result = await verifyCredential(input);

      setVerificationResult(result);

      await load();

      return result;
    } catch (err) {
      setVerifyError(
        err?.message ?? "Unable to verify credential"
      );

      return null;
    } finally {
      setVerifying(false);
    }
  },
  [load]
);

return {
  ...state,
  refresh: load,
  verify,
  verifying,
  verifyError,
  verificationResult,
};
