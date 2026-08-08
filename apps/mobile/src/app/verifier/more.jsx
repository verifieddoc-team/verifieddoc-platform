import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import { useAuth } from "../../hooks/useVerificationResult";

import VerifierHeader from "../../components/verifier/VerifierHeader";
import MoreMenuItem from "../../components/dashboard/MoreMenuItem"; // reused as-is from the org dashboard
import LogOutButton from "../../components/dashboard/LogOutButton"; // reused as-is from the org dashboard

const MENU_ITEMS = [
  { key: "activity-log", icon: "history", label: "Activity Log" },
  { key: "account-settings", icon: "settings", label: "Account Settings" },
  { key: "verification-results", icon: "help-outline", label: "Verification Results" },
  { key: "security-keys", icon: "lock-outline", label: "Security & Keys" },
  { key: "help-support", icon: "help-outline", label: "Help & Support" },
];

export default function VerifierMoreScreen() {
  const router = useRouter();
  const { user, logout } = useAuth?.() ?? { user: null, logout: null };

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) return null;

  const handleMenuPress = (key) => {
    if (key === "verification-results") {
      router.push("/verification-result");
      return;
    }

    // TODO: wire up navigation for the remaining destinations once those
    // screens exist (Activity Log, Account Settings, Security & Keys,
    // Help & Support).
    console.log("More menu pressed:", key);
  };

  const handleLogOut = () => {
    if (typeof logout === "function") {
      logout();
      return;
    }
    // TODO: no logout function found on auth state yet — wire this up to
    // your auth service (clear token/session, then router.replace("/auth/login")).
    console.log("Log out pressed — auth service not wired up yet");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <VerifierHeader
        onPressBell={() => {
          // TODO: navigate to a notifications screen once it exists
          console.log("Notification bell pressed");
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuList}>
          {MENU_ITEMS.map((item) => (
            <MoreMenuItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              onPress={() => handleMenuPress(item.key)}
            />
          ))}
        </View>

        <LogOutButton onPress={handleLogOut} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  menuList: {
    marginBottom: SPACING.sm,
  },
});
