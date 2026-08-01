import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import { useAuth } from "../../hooks/useDashboardData";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import MoreMenuItem from "../../components/dashboard/MoreMenuItem";
import LogOutButton from "../../components/dashboard/LogOutButton";

const MENU_ITEMS = [
  { key: "activity-log", icon: "history", label: "Activity Log" },
  { key: "organisation-portal", icon: "settings", label: "Organisation Portal" },
  { key: "security-keys", icon: "lock-outline", label: "Security & Keys" },
  { key: "help-support", icon: "help-outline", label: "Help & Support" },
];

export default function MoreScreen() {
  const { user, logout } = useAuth?.() ?? { user: null, logout: null };

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) return null;

  const handleMenuPress = (key) => {
    // TODO: wire up navigation for each destination once those screens exist.
    // e.g. router.push(`/dashboard/more/${key}`)
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
      <DashboardHeader user={user} />

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
