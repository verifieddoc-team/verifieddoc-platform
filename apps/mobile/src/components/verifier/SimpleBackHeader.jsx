// src/components/verifier/SimpleBackHeader.jsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * Minimal header for screens pushed on top of a tab (back arrow, optional
 * right-side action icon). Distinct from VerifierHeader/DashboardHeader,
 * which are for tab-root screens and don't have a back arrow.
 *
 * @param onBack        () => void
 * @param rightIcon     MaterialIcons name | null
 * @param onPressRight  () => void
 */
export default function SimpleBackHeader({ onBack, rightIcon = null, onPressRight }) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onBack} hitSlop={10} style={styles.iconButton}>
        <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.primary} />
      </Pressable>

      {rightIcon ? (
        <Pressable onPress={onPressRight} hitSlop={10} style={styles.iconButton}>
          <MaterialIcons name={rightIcon} size={22} color={COLORS.primary} />
        </Pressable>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
