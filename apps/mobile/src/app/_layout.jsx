import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SessionProvider } from "../context/session-context";
import { WalletProvider } from "../context/wallet-context";
import { colors } from "../theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <WalletProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: colors.surface },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.indigo,
              headerTitleStyle: { color: colors.ink, fontWeight: "700" },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="credential/[id]"
              options={{ title: "Credential details" }}
            />
            <Stack.Screen
              name="share/[id]"
              options={{ title: "Consent sharing" }}
            />
            <Stack.Screen name="verify" options={{ title: "Verify credential" }} />
            <Stack.Screen name="profile" options={{ title: "Profile" }} />
            <Stack.Screen name="activity" options={{ title: "Share activity" }} />
            <Stack.Screen name="about" options={{ title: "About VerifiedDoc" }} />
          </Stack>
        </WalletProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
