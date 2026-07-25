import * as SecureStore from "expo-secure-store";
import type { AuthSession } from "@verifieddoc/contracts";

const sessionKey = "verifieddoc.session";

export async function saveSession(session: AuthSession): Promise<void> {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readSession(): Promise<AuthSession | null> {
  const value = await SecureStore.getItemAsync(sessionKey);
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(sessionKey);
}
