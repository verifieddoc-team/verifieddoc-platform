// src/components/organisation/OrganisationHeader.jsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param onBack        () => void
 * @param hasNotifications boolean — controls the small red dot on the bell.
 *                       Defaults to false rather than assuming there's
 *                       something to notify about.
 * @param onPressBell   () => void
 * @param children      Optional content rendered inside the header,
 *                       e.g. the OrganisationSelector card, so it can
 *                       overlap the rounded bottom edge.
 */
export default function OrganisationHeader({
  onBack,
  hasNotifications = false,
  onPressBell,
  children,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.surface} />
        </Pressable>

        <Pressable onPress={onPressBell} hitSlop={10} style={styles.iconButton}>
          <MaterialIcons
            name="notifications-none"
            size={24}
            color={COLORS.surface}
          />
          {hasNotifications ? <View style={styles.notificationDot} /> : null}
        </Pressable>
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});
