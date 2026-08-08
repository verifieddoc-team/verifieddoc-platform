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

const CREDENTIALS = [
  {
    id: "1",
    title: "UI/UX Design Certificate",
    issuer: "Juliana Ogi",
    date: "Verified 2 days ago",
    status: "Verified",
    icon: require("../../../assets/images/icons/square-check.png"),
  },
  {
    id: "2",
    title: "Product Management Badge",
    issuer: "Juliana Ogi",
    date: "Verified 5 days ago",
    status: "Verified",
    icon: require("../../../assets/images/icons/square-check.png"),
  },
  {
    id: "3",
    title: "Blockchain Fundamentals",
    issuer: "Juliana Ogi",
    date: "Pending 1 day ago",
    status: "Pending",
    icon: require("../../../assets/images/icons/square-check.png"),
  },
];

const STATUS_COLOR = {
  Verified: COLORS.secondary,
  Pending: COLORS.accent,
  Expired: COLORS.error,
};

function StatusBadge({ status }) {
  return (
    <View
      style={[
        styles.badge,
        { borderColor: STATUS_COLOR[status] ?? COLORS.border },
      ]}
    >
      {status === "Verified" && (
        <MaterialIcons
          name="check-circle"
          size={12}
          color={STATUS_COLOR[status]}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          { color: STATUS_COLOR[status] ?? COLORS.textSecondary },
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function CredentialRow({ item }) {
  return (
    <View style={styles.credRow}>
      <View style={styles.credIconWrap}>
        <Image
          source={item.icon}
          style={styles.credIcon}
          resizeMode="contain"
        />
      </View>
      <View style={styles.credInfo}>
        <Text style={styles.credTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.credSub} numberOfLines={1}>
          {item.issuer} • {item.date}
        </Text>
      </View>
      <StatusBadge status={item.status} />
    </View>
  );
}

export default function CredsScreen() {
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
        <Text style={styles.pageTitle}>My Credentials</Text>
        <View style={styles.list}>
          {CREDENTIALS.map((item) => (
            <CredentialRow key={item.id} item={item} />
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
    lineHeight: 28,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  list: {
    gap: SPACING.sm,
  },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  credIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  credIcon: {
    width: 22,
    height: 22,
    tintColor: COLORS.primary,
  },
  credInfo: {
    flex: 1,
  },
  credTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: 2,
  },
  credSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
