// src/components/dashboard/OrganizationSummary.jsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param organization { name: string } | null
 * @param loading      boolean
 *
 * The organisation name comes from the authenticated org's data
 * (e.g. organization.name from auth/backend state). We never invent
 * a name — if it isn't available yet we show a neutral placeholder.
 */
export default function OrganizationSummary({ organization, loading = false }) {
  const name = organization?.name ?? null;

  return (
    <View style={styles.wrapper}>
      <Text style={styles.orgName}>
        {loading ? "Loading…" : name ?? "Your Organisation"}
      </Text>
      <Text style={styles.subtitle}>
        Overview of your organization&apos;s credential activity
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  orgName: {
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
