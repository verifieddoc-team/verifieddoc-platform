// src/components/organisation/RecentVerificationRequests.jsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";
import VerificationRequestItem from "./VerificationRequestItem";
import EmptyState from "../dashboard/EmptyState";

/**
 * @param requests    array | null
 * @param loading     boolean
 * @param onViewAll   () => void
 * @param onSelectItem (request) => void
 */
export default function RecentVerificationRequests({
  requests,
  loading = false,
  onViewAll,
  onSelectItem,
}) {
  const hasItems = Array.isArray(requests) && requests.length > 0;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Recent Verification Requests</Text>
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
            message="Loading verification requests…"
          />
        ) : hasItems ? (
          requests.map((request) => (
            <VerificationRequestItem
              key={request.id}
              request={request}
              onPress={onSelectItem}
            />
          ))
        ) : (
          <EmptyState
            icon="fact-check"
            message="No verification requests yet"
            subtext="Requests from verifiers will show up here"
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
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: COLORS.text,
  },
  viewAll: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.iconTeal,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginHorizontal: SPACING.lg,
    overflow: "hidden",
  },
});
