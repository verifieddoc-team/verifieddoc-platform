import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  Pressable,
  Platform,
} from "react-native";
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

const STATS = [
  { label: "Total", value: 12, icon: "layers", active: false },
  { label: "Verified", value: 8, icon: "check-circle", active: true },
  { label: "Pending", value: 1, icon: "hourglass-empty", active: false },
  { label: "Expired", value: 0, icon: "close", active: false },
];

const FEATURED_CRED = {
  id: "1",
  title: "UI/UX Design Certificate",
  issuer: "Juliana Ogi",
  date: "Verified 2 days ago",
  status: "Verified",
  icon: require("../../../assets/images/icons/square-check.png"),
  qr: require("../../../assets/images/icon.png"),
};

const RECENT_CREDS = [
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
    title: "UI/UX Design Certificate",
    issuer: "Juliana Ogi",
    date: "Verified 2 days ago",
    status: "Verified",
    icon: require("../../../assets/images/icons/square-check.png"),
  },
  {
    id: "3",
    title: "UI/UX Design Certificate",
    issuer: "Juliana Ogi",
    date: "Pending 2 days ago",
    status: "Pending",
    icon: require("../../../assets/images/icons/square-check.png"),
  },
  {
    id: "4",
    title: "UI/UX Design Certificate",
    issuer: "Juliana Ogi",
    date: "Verified 2 days ago",
    status: "Verified",
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

export default function WalletScreen() {
  const [activeDot, setActiveDot] = useState(0);

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
        <Text style={styles.pageTitle}>My Wallet</Text>

        <View style={styles.statsRow}>
          {STATS.map((s) => (
            <View
              key={s.label}
              style={[styles.statCard, s.active && styles.statCardActive]}
            >
              <MaterialIcons
                name={s.icon}
                size={20}
                color={s.active ? COLORS.surface : COLORS.primary}
              />
              <Text
                style={[styles.statValue, s.active && styles.statValueActive]}
              >
                {s.value}
              </Text>
              <Text
                style={[styles.statLabel, s.active && styles.statLabelActive]}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.featuredCard}>
          <View style={styles.featuredLeft}>
            <View style={styles.credIconWrap}>
              <Image
                source={FEATURED_CRED.icon}
                style={styles.credIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.credInfo}>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {FEATURED_CRED.title}
              </Text>
              <Text style={styles.featuredIssuer}>{FEATURED_CRED.issuer}</Text>
              <Text style={styles.featuredDate}>{FEATURED_CRED.date}</Text>
            </View>
          </View>

          <View style={styles.featuredRight}>
            <StatusBadge status={FEATURED_CRED.status} />
            <Image
              source={FEATURED_CRED.qr}
              style={styles.qrCode}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.dotsRow}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, i === activeDot && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Credentials</Text>
          <Pressable>
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {RECENT_CREDS.map((item) => (
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
    fontWeight: "500",
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceTint,
    paddingVertical: SPACING.sm + 2,
    gap: 2,
  },
  statCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statValue: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
    fontWeight: "500",
  },
  statValueActive: {
    color: COLORS.surface,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  statLabelActive: {
    color: "rgba(255,255,255,0.8)",
  },
  featuredCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceTint,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.07,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 3 },
    }),
  },
  featuredLeft: {
    flex: 1,
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  featuredRight: {
    alignItems: "flex-end",
    gap: SPACING.sm,
  },
  featuredTitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    fontWeight: "500",
    marginBottom: 2,
  },
  featuredIssuer: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  featuredDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  qrCode: {
    width: 64,
    height: 64,
    borderRadius: 8,
    opacity: 0.85,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dotInactive,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 20,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    lineHeight: 20,
    color: COLORS.text,
  },
  viewAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.secondary,
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
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 },
      },
      android: { elevation: 1 },
    }),
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
