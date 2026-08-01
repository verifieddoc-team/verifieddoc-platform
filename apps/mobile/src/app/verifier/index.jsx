import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import { useVerifierDashboard } from "../../hooks/useVerifierDashboard";
import { useAuth } from "../../hooks/useVerifierDashboard";

import VerifierHeader from "../../components/verifier/VerifierHeader";
import GreetingSection from "../../components/verifier/GreetingSection";
import VerifyCredentialForm from "../../components/verifier/VerifyCredentialForm";
import RecentVerifications from "../../components/verifier/RecentVerifications";
import StatCard from "../../components/dashboard/StatCard"; // reused as-is, same card shape as the org dashboard
import EmptyState from "../../components/dashboard/EmptyState";

export default function VerifierHomeScreen() {
  const router = useRouter();
  const { user } = useAuth?.() ?? { user: null };

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const {
    loading,
    error,
    stats,
    recentVerifications,
    verify,
    verifying,
    verifyError,
  } = useVerifierDashboard();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <VerifierHeader
        onPressBell={() => {
          // TODO: navigate to a notifications screen once it exists
          console.log("Notification bell pressed");
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <GreetingSection name={user?.name} loading={loading} />

        {error ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="error-outline"
              message="Couldn't load your dashboard"
              subtext={error}
            />
          </View>
        ) : (
          <>
            <StatCard
              title="Total"
              value={stats.total?.value}
              description={stats.total?.description}
              descriptionTone="positive"
              loading={loading}
            />
            <StatCard
              title="Verified"
              value={stats.verified?.value}
              description={stats.verified?.description}
              descriptionTone="positive"
              loading={loading}
            />
            <StatCard
              title="Failed Verifications"
              value={stats.failedVerifications?.value}
              description={stats.failedVerifications?.description}
              descriptionTone="error"
              loading={loading}
            />
          </>
        )}

        <VerifyCredentialForm onVerify={verify} verifying={verifying} />
        {verifyError ? (
          <View style={styles.verifyErrorWrap}>
            <EmptyState icon="error-outline" message={verifyError} />
          </View>
        ) : null}

        <RecentVerifications
          records={recentVerifications}
          loading={loading}
          onViewAll={() => router.push("/verifier/history")}
          onSelectItem={(record) => {
            // TODO: navigate to a verification detail screen once it exists
            console.log("Selected record:", record.id);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  errorWrap: {
    marginHorizontal: SPACING.lg,
  },
  verifyErrorWrap: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
});
