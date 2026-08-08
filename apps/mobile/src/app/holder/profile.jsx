import React from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import HolderHeader from "./_HolderHeader";

const PROFILE_ITEMS = [
  { label: "Email", value: "jane.holder@example.test", icon: "email" },
  { label: "Name", value: "Jane Holder", icon: "person" },
  { label: "Phone", value: "+1 234 567 890", icon: "phone" },
  { label: "Member since", value: "March 2026", icon: "calendar-today" },
];

export default function ProfileScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HolderHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <Image
            source={require("../../../assets/images/main-logo.png")}
            style={styles.avatar}
            resizeMode="contain"
          />
          <Text style={styles.name}>Jane Holder</Text>
          <Text style={styles.role}>Credential Holder</Text>
        </View>

        <View style={styles.infoList}>
          {PROFILE_ITEMS.map((item) => (
            <View key={item.label} style={styles.infoItem}>
              <View style={styles.infoIconWrap}>
                <MaterialIcons
                  name={item.icon}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  pageTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  profileCard: {
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 20,
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: SPACING.sm,
  },
  name: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 4,
  },
  role: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  infoList: {
    gap: SPACING.sm,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
  },
});
