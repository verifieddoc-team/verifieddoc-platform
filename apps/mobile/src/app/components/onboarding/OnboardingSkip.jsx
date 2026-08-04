import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../../constants/theme";

export default function OnboardingSkip({ onPress }) {
  return (
    <View style={styles.topRow}>
      <Pressable onPress={onPress} style={styles.skipButton} hitSlop={8}>
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: SPACING.xs,
  },
  skipButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-end",
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.surface,
  },
});