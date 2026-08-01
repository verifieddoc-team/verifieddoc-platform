import React from "react";
import { Text, StyleSheet } from "react-native";
import { COLORS } from "../../constants/theme";
import { maskEmail } from "../../utils/maskEmail";

export default function MaskedEmail({ email, style }) {
  return <Text style={[styles.text, style]}>{maskEmail(email)}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.primary,
  },
});