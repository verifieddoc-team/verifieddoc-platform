// src/components/verifier/VerificationStatusCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

// The three possible verification states. Icon/color/title are stable UI
// copy (they describe what the status *means*, same as a badge label) —
// they don't come from the backend. The colors are drawn from the shared
// theme rather than introducing new ones. Note: the theme has no green,
// so "verified" reuses COLORS.secondary as the app's existing positive/
// success color (the same convention already used in StatCard).
const STATUS_CONFIG = {
  verified: {
    icon: "verified",
    color: COLORS.secondary,
    title: "Verified",
    defaultMessage: "This document has been verified as genuine",
  },
  under_review: {
    icon: "find-in-page",
    color: COLORS.accent,
    title: "Under Review",
    defaultMessage: "This document is currently under review",
  },
  rejected: {
    icon: "cancel",
    color: COLORS.error,
    title: "Rejected",
    defaultMessage: "This document could not be verified.",
  },
};

/**
 * @param status         "verified" | "under_review" | "rejected"
 * @param message         string | null — overrides the default status
 *                        copy if the backend supplies its own.
 * @param timestampLabel  string | null — e.g. "verified on July 5, 2026 . 09:10 AM".
 *                        Pre-formatted by the caller from real data; if
 *                        null (no data yet), the line simply isn't shown
 *                        rather than inventing a date.
 */
export default function VerificationStatusCard({ status, message, timestampLabel }) {
  const config = STATUS_CONFIG[status];

  if (!config) {
    return (
      <View style={styles.card}>
        <Text style={styles.fallbackText}>Verification status unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <MaterialIcons name={config.icon} size={48} color={config.color} />
      <Text style={[styles.title, { color: config.color }]}>{config.title}</Text>
      <Text style={styles.message}>{message ?? config.defaultMessage}</Text>
      {timestampLabel ? <Text style={styles.timestamp}>{timestampLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 18,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    marginHorizontal: SPACING.lg,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  message: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    lineHeight: 20,
  },
  timestamp: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    textAlign: "center",
    marginTop: 2,
  },
  fallbackText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
