import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import { useVerificationResults } from "../../hooks/useVerificationResults";

import SimpleBackHeader from "../../components/verifier/SimpleBackHeader";
import VerificationHistoryItem from "../../components/verifier/VerificationHistoryItem"; // reused as-is
import EmptyState from "../../components/dashboard/EmptyState"; // reused as-is

export default function VerificationResultsListScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { loading, error, results } = useVerificationResults();

  if (!fontsLoaded) return null;

  const hasItems = Array.isArray(results) && results.length > 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <SimpleBackHeader onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Verification Results</Text>

        <View style={styles.card}>
          {error ? (
            <EmptyState
              icon="error-outline"
              message="Couldn't load verification results"
              subtext={error}
            />
          ) : loading ? (
            <EmptyState icon="hourglass-empty" message="Loading results…" />
          ) : hasItems ? (
            results.map((record) => (
              <VerificationHistoryItem
                key={record.id}
                record={{
                  id: record.id,
                  title: record.documentName,
                  issuerName: record.issuerName,
                  status: record.status,
                  statusLabel: record.statusLabel,
                  relativeTime: record.relativeTime,
                }}
                onPress={(selected) =>
                  router.push(`/verification-result/${selected.id}`)
                }
              />
            ))
          ) : (
            <EmptyState
              icon="fact-check"
              message="No verification results yet"
              subtext="Results from documents you verify will show up here"
            />
          )}
        </View>
      </ScrollView>
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
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22,
    color: COLORS.text,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
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
