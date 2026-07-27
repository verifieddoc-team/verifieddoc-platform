import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { mobileApi } from "../services/api";
import { demoSession } from "../services/demo";
import { clearSession, readSession, saveSession } from "../services/session";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isDemo, setIsDemo] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let active = true;

    async function restore() {
      const stored = await readSession();
      if (!active || !stored) {
        if (active) setInitializing(false);
        return;
      }

      const storedSession = stored.session ?? stored;
      const storedDemo = Boolean(stored.isDemo);
      if (storedDemo) {
        setSession(storedSession);
        setIsDemo(true);
        setInitializing(false);
        return;
      }

      try {
        const refreshed = await mobileApi.refresh(storedSession.refreshToken);
        if (!active) return;
        setSession(refreshed);
        await saveSession({ session: refreshed, isDemo: false });
      } catch {
        await clearSession();
      } finally {
        if (active) setInitializing(false);
      }
    }

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const nextSession = await mobileApi.login(email, password);
    if (nextSession.user.role !== "HOLDER") {
      throw new Error(
        "The mobile app is currently for credential holders. Use the web app for organization or platform operations.",
      );
    }
    setSession(nextSession);
    setIsDemo(false);
    await saveSession({ session: nextSession, isDemo: false });
  }, []);

  const startDemo = useCallback(async () => {
    setSession(demoSession);
    setIsDemo(true);
    await saveSession({ session: demoSession, isDemo: true });
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    setIsDemo(false);
    await clearSession();
    if (current && !isDemo) {
      try {
        await mobileApi.logout(current.refreshToken);
      } catch {
        // Local sign-out still completes if the API is unavailable.
      }
    }
  }, [isDemo, session]);

  const value = useMemo(
    () => ({ session, isDemo, initializing, signIn, startDemo, signOut }),
    [initializing, isDemo, session, signIn, signOut, startDemo],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return context;
}
