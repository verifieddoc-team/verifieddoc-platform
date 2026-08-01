import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

const STATUS_CONFIG = {
  active: { label: "Active", bg: "#E4F2E9", dot: COLORS.secondary },
  pending: { label: "Pending", bg: "#FBF0DD", dot: COLORS.accent },
  revoked: { label: "Revoked", bg: "#F8E5E1", dot: COLORS.error },
};

/**
 * credential shape (from backend, once wired up):
 * {
 *   id: string,
 *   title: string,
 *   recipientName: string,
 *   issueDate: string,        // pre-formatted display date
 *   status: "active" | "pending" | "revoked",
 * }
 */
export default function CredentialListItem({ credential, onPress }) {
  const status = STATUS_CONFIG[credential.status] ?? STATUS_CONFIG.pending;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress?.(credential)}
    >
      <View style={styles.thumbnail}>
        <MaterialIcons name="description" size={20} color={COLORS.surface} />
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {credential.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          Issued to {credential.recipientName} · {credential.issueDate}
        </Text>

        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <View style={[styles.dot, { backgroundColor: status.dot }]} />
          <Text style={[styles.badgeText, { color: status.dot }]}>
            {status.label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
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
    marginBottom: SPACING.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
