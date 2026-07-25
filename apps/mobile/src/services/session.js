import * as SecureStore from "expo-secure-store";

const sessionKey = "verifieddoc.session";

export async function saveSession(session) {
  await SecureStore.setItemAsync(sessionKey, JSON.stringify(session), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function readSession() {
  const value = await SecureStore.getItemAsync(sessionKey);
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(sessionKey);
}