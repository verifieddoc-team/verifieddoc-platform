// src/components/organisation/OrganisationStatCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param title           string
 * @param value            number | string | null
 * @param icon             MaterialIcons name
 * @param iconBackground   background colour behind the icon badge
 * @param iconColor        colour of the icon itself
 * @param trendDirection   "up" | "down" | null
 * @param trendValue       string | null   e.g. "12.5%" — pre-formatted by the caller
 * @param trendColor       colour for the trend arrow + percentage text
 * @param comparisonLabel  string          e.g. "vs last 30 days"
 * @param loading          boolean
 *
 * Never invents numbers: if `value` is null/undefined and `loading` is
 * false, it renders a dash instead of a fabricated statistic.
 */
export default function OrganisationStatCard({
  title,
  value,
  icon,
  iconBackground = COLORS.surfaceTint,
  iconColor = COLORS.iconTeal,
  trendDirection = null,
  trendValue = null,
  trendColor = COLORS.textSecondary,
  comparisonLabel = "vs last 30 days",
  loading = false,
}) {
  const hasValue = value !== null && value !== undefined;
  const hasTrend = !loading && trendDirection && trendValue;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.value}>
          {loading ? "…" : hasValue ? String(value) : "—"}
        </Text>

        {icon ? (
          <View style={[styles.iconBadge, { backgroundColor: iconBackground }]}>
            <MaterialIcons name={icon} size={18} color={iconColor} />
          </View>
        ) : null}
      </View>

      {hasTrend ? (
        <View style={styles.trendRow}>
          <MaterialIcons
            name={trendDirection === "up" ? "arrow-upward" : "arrow-downward"}
            size={14}
            color={trendColor}
          />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {trendValue}
          </Text>
          <Text style={styles.comparisonText}> {comparisonLabel}</Text>
        </View>
      ) : loading ? (
        <View style={styles.skeletonLine} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  topRow: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: COLORS.text,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACING.sm,
    flexWrap: "wrap",
  },
  trendText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginLeft: 3,
  },
  comparisonText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  skeletonLine: {
    height: 12,
    width: "60%",
    borderRadius: 4,
    backgroundColor: COLORS.surfaceTint,
    marginTop: SPACING.sm,
  },
});
