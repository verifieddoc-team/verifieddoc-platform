import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * One row on the "More" screen (Activity Log, Organisation Portal, etc.)
 *
 * @param icon    MaterialIcons name
 * @param label   string
 * @param onPress () => void
 */
export default function MoreMenuItem({ icon, label, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <MaterialIcons name={icon} size={22} color={COLORS.primary} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardPressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
});
