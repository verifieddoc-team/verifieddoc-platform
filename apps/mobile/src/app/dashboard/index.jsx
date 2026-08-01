import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import { useDashboardData } from "../../hooks/useDashboardData";
import { useAuth } from "../../hooks/useDashboardData"

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import OrganizationSummary from "../../components/dashboard/OrganizationSummary";
import StatCard from "../../components/dashboard/StatCard";
import RecentlyIssued from "../../components/dashboard/RecentlyIssued";
import EmptyState from "../../components/dashboard/EmptyState";

export default function DashboardHomeScreen() {
  const router = useRouter();
  const { user } = useAuth?.() ?? { user: null };

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const { loading, error, organization, stats, recentlyIssued, refresh } =
    useDashboardData();

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <DashboardHeader user={user} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OrganizationSummary organization={organization} loading={loading} />

        {error ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="error-outline"
              message="Couldn't load dashboard data"
              subtext={error}
            />
          </View>
        ) : (
          <>
            <StatCard
              title="Total Credentials Issued"
              value={stats.totalCredentials?.value}
              description={stats.totalCredentials?.description}
              descriptionTone="positive"
              loading={loading}
            />
            <StatCard
              title="Recipients"
              value={stats.recipients?.value}
              description={stats.recipients?.description}
              descriptionTone="positive"
              loading={loading}
            />
            <StatCard
              title="Pending Verification Request"
              value={stats.pendingVerification?.value}
              description={stats.pendingVerification?.description}
              descriptionTone="warning"
              loading={loading}
            />

            <RecentlyIssued
              credentials={recentlyIssued}
              loading={loading}
              onViewAll={() => router.push("/dashboard/manage")}
              onSelectItem={(credential) => {
                // TODO: navigate to a credential detail screen once it exists
                console.log("Selected credential:", credential.id);
              }}
            />
          </>
        )}
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
});
