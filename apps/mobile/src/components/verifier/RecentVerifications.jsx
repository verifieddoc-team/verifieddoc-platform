import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import VerificationHistoryItem from "./VerificationHistoryItem";
import EmptyState from "../dashboard/EmptyState";

/**
 * @param records     array | null
 * @param loading     boolean
 * @param onViewAll   () => void
 * @param onSelectItem (record) => void
 */
export default function RecentVerifications({
  records,
  loading = false,
  onViewAll,
  onSelectItem,
}) {
  const hasItems = Array.isArray(records) && records.length > 0;

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
          <EmptyState icon="hourglass-empty" message="Loading recent activity…" />
        ) : hasItems ? (
          records.map((record) => (
            <VerificationHistoryItem
              key={record.id}
              record={record}
              onPress={onSelectItem}
            />
          ))
        ) : (
          <EmptyState
            icon="fact-check"
            message="No verification history yet"
            subtext="Credentials you verify will show up here"
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
