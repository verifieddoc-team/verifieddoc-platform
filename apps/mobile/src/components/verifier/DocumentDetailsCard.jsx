// src/components/verifier/DocumentDetailsCard.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * Generic "label: value" rows card. The screen decides which rows to pass
 * in based on the verification status (Verified/Under Review/Rejected each
 * need a different field set) — this component just renders whatever it's
 * given, so there's one implementation instead of three near-duplicates.
 *
 * @param rows  Array<{
 *   key: string,
 *   icon?: MaterialIcons name,
 *   label: string,
 *   value: string | null,     // null/empty renders as "—", never invented
 *   valueColor?: string,      // e.g. COLORS.error for a rejection reason
 * }>
 */
export default function DocumentDetailsCard({ rows }) {
  return (
    <View style={styles.card}>
      {rows.map((row, index) => (
        <View
          key={row.key}
          style={[
            styles.row,
            index === rows.length - 1 && styles.rowLast,
          ]}
        >
          <View style={styles.labelGroup}>
            {row.icon ? (
              <MaterialIcons
                name={row.icon}
                size={18}
                color={COLORS.primary}
                style={styles.labelIcon}
              />
            ) : null}
            <Text style={styles.label}>{row.label}</Text>
          </View>

          <Text
            style={[
              styles.value,
              row.valueColor ? { color: row.valueColor } : null,
            ]}
            numberOfLines={2}
          >
            {row.value || "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 18,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm + 2,
  },
  rowLast: {
    paddingBottom: SPACING.md,
  },
  labelGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  labelIcon: {
    marginRight: SPACING.sm,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    flexShrink: 1,
  },
  value: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
    textAlign: "right",
    marginLeft: SPACING.md,
    flexShrink: 1,
  },
});
