import React from "react";
import { View, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";

export default function OnboardingPagination({ total = 3, activeIndex = 0 }) {
  return (
    <View style={styles.pagination}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[styles.dot, index === activeIndex && styles.dotActive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.dotInactive,
    marginHorizontal: 8,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
  },
});