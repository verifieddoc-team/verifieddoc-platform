// src/components/dashboard/RecentlyIssued.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import CredentialListItem from "./CredentialListItem";
import EmptyState from "./EmptyState";

/**
 * @param credentials  array | null   — null/undefined while unloaded
 * @param loading      boolean
 * @param onViewAll    () => void
 * @param onSelectItem (credential) => void
 */
export default function RecentlyIssued({
  credentials,
  loading = false,
  onViewAll,
  onSelectItem,
}) {
  const hasItems = Array.isArray(credentials) && credentials.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Recently Issued</Text>
        {hasItems ? (
          <Pressable onPress={onViewAll} hitSlop={8}>
            <Text style={styles.viewAll}>View all</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.card}>
        {loading ? (
          <EmptyState
            icon="hourglass-empty"
            message="Loading recent credentials…"
          />
        ) : hasItems ? (
          credentials.map((credential) => (
            <CredentialListItem
              key={credential.id}
              credential={credential}
              onPress={onSelectItem}
            />
          ))
        ) : (
          <EmptyState
            icon="description"
            message="No credentials issued yet"
            subtext="Credentials you issue will show up here"
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
  },
  viewAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.iconTeal,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginHorizontal: SPACING.lg,
    overflow: "hidden",
  },
});
