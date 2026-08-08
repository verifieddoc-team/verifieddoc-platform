import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { COLORS } from "../../../constants/theme";

// variant: "primary" (filled, e.g. Next / Get Started) or "secondary" (outlined, e.g. Sign In)
export default function OnboardingButton({ label, onPress, variant = "primary" }) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      style={({ pressed }) => [
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        pressed &&
          (isPrimary ? styles.primaryButtonPressed : styles.secondaryButtonPressed),
      ]}
      onPress={onPress}
    >
      <Text style={isPrimary ? styles.primaryButtonText : styles.secondaryButtonText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.surface,
  },
  secondaryButton: {
    backgroundColor: COLORS.surfaceTint,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    elevation: 0,
    shadowOpacity: 0,
  },
  secondaryButtonPressed: {
    backgroundColor: COLORS.background,
  },
  secondaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primary,
  },
});