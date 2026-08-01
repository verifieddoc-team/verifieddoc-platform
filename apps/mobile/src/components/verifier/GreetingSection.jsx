import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param name    string | null — the verifier's display name, from auth
 *                state. Never hardcoded.
 * @param loading boolean
 */
export default function GreetingSection({ name, loading = false }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.greeting}>
        {loading ? "Hi there" : name ? `Hi, ${name}` : "Welcome back"}
      </Text>
      <Text style={styles.subtitle}>verify a credential or review your history</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
