import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param user  { initials?: string, avatarUrl?: string } | null
 *              Comes from auth state. Neither field is hardcoded here —
 *              if both are absent we fall back to a generic placeholder.
 */
export default function DashboardHeader({ user }) {
  const initials = user?.initials ?? null;
  const avatarUrl = user?.avatarUrl ?? null;

  return (
    <View style={styles.header}>
      <Image
        source={require("../../../assets/images/main-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.avatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarInitials}>{initials ?? "?"}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logo: {
    width: 150,
    height: 36,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitials: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.surface,
  },
});
