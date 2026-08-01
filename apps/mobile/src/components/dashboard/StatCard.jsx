import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

export default function StatCard({
  title,
  value,
  description,
  descriptionTone = "neutral",
  loading = false,
}) {
  const hasValue = value !== null && value !== undefined;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <Text style={styles.value}>
        {loading ? "…" : hasValue ? String(value) : "—"}
      </Text>

      {loading ? (
        <View style={styles.skeletonLine} />
      ) : description ? (
        <Text style={[styles.description, TONE_STYLES[descriptionTone]]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const TONE_STYLES = StyleSheet.create({
  neutral: { color: COLORS.textSecondary },
  positive: { color: COLORS.secondary },
  warning: { color: COLORS.accent },
  error: { color: COLORS.error },
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  value: {
    fontFamily: "Poppins_700Bold",
    fontSize: 32,
    lineHeight: 38,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  skeletonLine: {
    height: 13,
    width: "50%",
    borderRadius: 4,
    backgroundColor: COLORS.surfaceTint,
  },
});
