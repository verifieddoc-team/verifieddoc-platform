import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import { useVerificationResult } from "../../hooks/useVerificationResult";

import SimpleBackHeader from "../../components/verifier/SimpleBackHeader";
import VerificationStatusCard from "../../components/verifier/VerificationStatusCard";
import DocumentDetailsCard from "../../components/verifier/DocumentDetailsCard";
import EmptyState from "../../components/dashboard/EmptyState";

// Per-status bottom action config. This is the one place that decides
// what changes between the three states in the footer — label, icon,
// and what pressing it should eventually do.
const BOTTOM_ACTION_CONFIG = {
  verified: { label: "Download Result", icon: "file-download" },
  under_review: { label: "Track Status", icon: null },
  rejected: { label: "View More Details", icon: null },
};

// Builds the Document Details rows for whichever status is active. Doing
// this as a small function (rather than three separate screens/cards)
// keeps VerificationStatusCard and DocumentDetailsCard fully reusable —
// only this mapping needs to change if a field is added later.
function buildDetailRows(status, document) {
  if (!document) return [];

  const base = [
    { key: "type", icon: "description", label: "Document Type", value: document.type },
    { key: "name", icon: "article", label: "Document Name", value: document.name },
    { key: "documentId", icon: "badge", label: "Document ID", value: document.documentId },
    { key: "issuedBy", icon: "person", label: "Issued by", value: document.issuedBy },
    {
      key: "holderName",
      icon: "assignment-ind",
      label: "Holder Name",
      value: document.holderName,
    },
  ];

  if (status === "under_review") {
    return [
      ...base,
      {
        key: "submittedOn",
        icon: "event",
        label: "Submitted On",
        value: document.submittedOn,
      },
    ];
  }

  if (status === "rejected") {
    return [
      ...base,
      { key: "issueDate", icon: "event", label: "Issue Date", value: document.issueDate },
      {
        key: "rejectionReason",
        label: "Reason for Rejection",
        value: document.rejectionReason,
        valueColor: COLORS.error,
      },
    ];
  }

  // verified (default)
  return [
    ...base,
    { key: "issueDate", icon: "event", label: "Issue Date", value: document.issueDate },
    { key: "expirationDate", label: "Expiration Date", value: document.expirationDate },
  ];
}

export default function VerificationResultDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { loading, error, result } = useVerificationResult(id);

  if (!fontsLoaded) return null;

  const handleDownload = () => {
    // TODO: wire up the actual download once the backend/file storage
    // for verification results exists.
    console.log("Download/track/details action pressed for result:", id);
  };

  const status = result?.status ?? null;
  const actionConfig = status ? BOTTOM_ACTION_CONFIG[status] : null;
  const rows = buildDetailRows(status, result?.document);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <SimpleBackHeader
        onBack={() => router.back()}
        rightIcon={status ? "file-download" : null}
        onPressRight={handleDownload}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Verification Result</Text>

        {error ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="error-outline"
              message="Couldn't load this result"
              subtext={error}
            />
          </View>
        ) : loading ? (
          <View style={styles.errorWrap}>
            <EmptyState icon="hourglass-empty" message="Loading verification result…" />
          </View>
        ) : !result ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="fact-check"
              message="Result not found"
              subtext="This verification result may no longer be available"
            />
          </View>
        ) : (
          <>
            <VerificationStatusCard
              status={result.status}
              message={result.message}
              timestampLabel={result.timestampLabel}
            />

            <Text style={styles.sectionHeading}>Document Details</Text>
            <DocumentDetailsCard rows={rows} />
          </>
        )}
      </ScrollView>

      {actionConfig ? (
        <Pressable
          onPress={handleDownload}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          {actionConfig.icon ? (
            <MaterialIcons
              name={actionConfig.icon}
              size={20}
              color={COLORS.surface}
              style={styles.actionIcon}
            />
          ) : null}
          <Text style={styles.actionText}>{actionConfig.label}</Text>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 28,
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  sectionHeading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  errorWrap: {
    marginHorizontal: SPACING.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 14,
  },
  actionButtonPressed: {
    opacity: 0.9,
  },
  actionIcon: {
    marginRight: SPACING.sm,
  },
  actionText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: COLORS.surface,
  },
});
