import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mobileApi } from "../services/api";
import { demoWallet } from "../services/demo";
import { useSession } from "./session-context";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const { session, isDemo } = useSession();
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session) {
      setCredentials([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (isDemo) {
        setCredentials(demoWallet);
      } else {
        const response = await mobileApi.wallet(session.accessToken);
        setCredentials(response.data);
      }
    } catch (caught) {
      setError(caught.message ?? "Could not load your credential wallet.");
    } finally {
      setLoading(false);
    }
  }, [isDemo, session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const value = useMemo(
    () => ({ credentials, loading, error, refresh }),
    [credentials, error, loading, refresh],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used inside WalletProvider");
  }
  return context;
}
