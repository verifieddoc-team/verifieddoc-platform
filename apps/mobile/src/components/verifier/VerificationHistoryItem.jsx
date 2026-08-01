import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

const STATUS_COLOR = {
  verified: COLORS.secondary,
  failed: COLORS.error,
  checked: COLORS.textSecondary,
};

/**
 * record shape (from backend, once wired up):
 * {
 *   id: string,
 *   title: string,          // credential title
 *   issuerName: string,
 *   status: "verified" | "failed" | "checked",
 *   statusLabel: string,    // pre-formatted, e.g. "Verified", "Checked"
 *   relativeTime: string,   // pre-formatted, e.g. "2 days ago"
 * }
 */
export default function VerificationHistoryItem({ record, onPress }) {
  const statusColor = STATUS_COLOR[record.status] ?? COLORS.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress?.(record)}
    >
      <View style={styles.thumbnail}>
        <MaterialIcons name="description" size={20} color={COLORS.surface} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {record.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {record.issuerName}
          {record.statusLabel ? ` · ${record.statusLabel}` : ""}
          {record.relativeTime ? ` ${record.relativeTime}` : ""}
        </Text>
      </View>

      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowPressed: {
    backgroundColor: COLORS.surfaceTint,
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 2,
  },
  meta: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: SPACING.sm,
  },
});
