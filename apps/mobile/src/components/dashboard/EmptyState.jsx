// src/components/dashboard/EmptyState.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

export default function EmptyState({
  icon = "inbox",
  message = "Nothing here yet",
  subtext = null,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <MaterialIcons name={icon} size={22} color={COLORS.iconTeal} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  message: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
  },
  subtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
