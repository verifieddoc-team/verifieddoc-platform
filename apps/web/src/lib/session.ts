import type { AuthSession } from "@verifieddoc/contracts";

const sessionKey = "verifieddoc.web.session";

export function saveWebSession(session: AuthSession): void {
  window.sessionStorage.setItem(sessionKey, JSON.stringify(session));
}

export function readWebSession(): AuthSession | null {
  const value = window.sessionStorage.getItem(sessionKey);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    clearWebSession();
    return null;
  }
}

export function clearWebSession(): void {
  window.sessionStorage.removeItem(sessionKey);
}
