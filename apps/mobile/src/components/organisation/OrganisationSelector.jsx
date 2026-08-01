// src/components/organisation/OrganisationSelector.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param organisation { name: string, verificationStatus: string } | null
 * @param loading       boolean
 * @param onPress       () => void  — opens an org switcher later, if the
 *                       user manages more than one organisation.
 */
export default function OrganisationSelector({
  organisation,
  loading = false,
  onPress,
}) {
  const name = organisation?.name ?? null;
  const status = organisation?.verificationStatus ?? null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.iconCircle}>
        <MaterialCommunityIcons
          name="bank"
          size={24}
          color={COLORS.iconTeal}
        />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.name} numberOfLines={1}>
          {loading ? "Loading organisation…" : name ?? "No organisation linked"}
        </Text>
        {!loading && status ? (
          <Text style={styles.status}>{status}</Text>
        ) : !loading && !name ? (
          <Text style={styles.statusMuted}>
            Connect your organisation to continue
          </Text>
        ) : null}
      </View>

      <MaterialIcons name="expand-more" size={24} color={COLORS.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.lg,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.9,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  textBlock: {
    flex: 1,
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
  },
  status: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.secondary,
    marginTop: 2,
  },
  statusMuted: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
