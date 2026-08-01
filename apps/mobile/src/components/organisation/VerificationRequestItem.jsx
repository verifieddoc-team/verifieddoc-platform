// src/components/organisation/VerificationRequestItem.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

const STATUS_CONFIG = {
  verified: { label: "Verified", bg: "#E4F2E9", color: COLORS.secondary },
  pending: { label: "Pending", bg: "#FBF0DD", color: COLORS.accent },
  rejected: { label: "Rejected", bg: "#F8E5E1", color: COLORS.error },
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return initials.join("") || "?";
}

/**
 * request shape (from backend, once wired up):
 * {
 *   id: string,
 *   applicantName: string,
 *   documentName: string,
 *   status: "verified" | "pending" | "rejected",
 *   time: string,          // pre-formatted display time
 * }
 */
export default function VerificationRequestItem({ request, onPress }) {
  const status = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => onPress?.(request)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(request.applicantName)}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {request.applicantName}
        </Text>
        <Text style={styles.document} numberOfLines={1}>
          {request.documentName}
        </Text>
      </View>

      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={[styles.badgeText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        {request.time ? <Text style={styles.time}>{request.time}</Text> : null}
      </View>
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCE6F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  avatarText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.text,
  },
  document: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  right: {
    alignItems: "flex-end",
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: COLORS.textSecondary,
  },
});
