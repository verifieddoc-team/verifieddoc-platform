import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import {
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";

import {
  COLORS,
  SPACING,
} from "../../constants/theme";
import { useOrganisationDashboard } from "../../hooks/useOrganisationDashboard";

import OrganisationHeader from "../../components/organisation/OrganisationHeader";
import OrganisationSelector from "../../components/organisation/OrganisationSelector";
import OrganisationStatCard from "../../components/organisation/OrganisationStatCard";
import RecentVerificationRequests from "../../components/organisation/RecentVerificationRequests";
import EmptyState from "../../components/dashboard/EmptyState";

export default function OrganisationPortalScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const {
    loading,
    error,
    organisation,
    statistics,
    recentRequests,
  } = useOrganisationDashboard();

  if (!fontsLoaded) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  const handleIssueDocument = () => {
    router.push("/organisation/issue");
  };

  const handleManageCredentials = () => {
    router.push("/organisation/credentials");
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <OrganisationHeader onBack={handleBack}>
          <OrganisationSelector
            organisation={organisation}
            loading={loading}
          />
        </OrganisationHeader>

        <View style={styles.body}>
          <Text style={styles.overviewHeading}>
            Overview
          </Text>

          {error ? (
            <EmptyState
              icon="error-outline"
              message="Couldn't load organisation data"
              subtext={error}
            />
          ) : (
            <>
              <View style={styles.statGrid}>
                <OrganisationStatCard
                  title="Documents Issued"
                  value={
                    statistics.documentsIssued?.value
                  }
                  icon="description"
                  iconBackground="#DCEFEC"
                  iconColor={COLORS.iconTeal}
                  trendDirection={
                    statistics.documentsIssued
                      ?.trendDirection
                  }
                  trendValue={
                    statistics.documentsIssued
                      ?.trendValue
                  }
                  trendColor={COLORS.primary}
                  loading={loading}
                />

                <OrganisationStatCard
                  title="Verification Requests"
                  value={
                    statistics.verificationRequests
                      ?.value
                  }
                  icon="search"
                  iconBackground="#DCEFEC"
                  iconColor={COLORS.iconTeal}
                  trendDirection={
                    statistics.verificationRequests
                      ?.trendDirection
                  }
                  trendValue={
                    statistics.verificationRequests
                      ?.trendValue
                  }
                  trendColor={COLORS.iconTeal}
                  loading={loading}
                />

                <OrganisationStatCard
                  title="Pending Requests"
                  value={
                    statistics.pendingRequests?.value
                  }
                  icon="schedule"
                  iconBackground="#F3E7D3"
                  iconColor={COLORS.accent}
                  trendDirection={
                    statistics.pendingRequests
                      ?.trendDirection
                  }
                  trendValue={
                    statistics.pendingRequests
                      ?.trendValue
                  }
                  trendColor={COLORS.accent}
                  loading={loading}
                />

                <OrganisationStatCard
                  title="Revoked Documents"
                  value={
                    statistics.revokedDocuments?.value
                  }
                  icon="cancel"
                  iconBackground="#F6DEDA"
                  iconColor={COLORS.error}
                  trendDirection={
                    statistics.revokedDocuments
                      ?.trendDirection
                  }
                  trendValue={
                    statistics.revokedDocuments
                      ?.trendValue
                  }
                  trendColor={COLORS.error}
                  loading={loading}
                />
              </View>

              <RecentVerificationRequests
                requests={recentRequests}
                loading={loading}
                onViewAll={() => {
                  console.log(
                    "View all verification requests pressed"
                  );
                }}
                onSelectItem={(request) => {
                  console.log(
                    "Selected request:",
                    request.id
                  );
                }}
              />
            </>
          )}

          <Pressable
            onPress={handleIssueDocument}
            style={({ pressed }) => [
              styles.issueButton,
              pressed &&
                styles.issueButtonPressed,
            ]}
          >
            <View style={styles.issueButtonLeft}>
              <MaterialIcons
                name="find-in-page"
                size={20}
                color={COLORS.surface}
              />

              <Text style={styles.issueButtonText}>
                Issue Document
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color={COLORS.surface}
            />
          </Pressable>

          <Pressable
            onPress={handleManageCredentials}
            style={({ pressed }) => [
              styles.manageButton,
              pressed &&
                styles.issueButtonPressed,
            ]}
          >
            <View style={styles.issueButtonLeft}>
              <MaterialIcons
                name="folder-open"
                size={20}
                color={COLORS.primary}
              />

              <Text style={styles.manageButtonText}>
                Manage Issued Credentials
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={22}
              color={COLORS.primary}
            />
          </Pressable>
        </View>
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
    backgroundColor: COLORS.surfaceTint,
  },

  scrollContent: {
    paddingBottom: SPACING.xxl,
  },

  body: {
    marginTop: -SPACING.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },

  overviewHeading: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },

  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  issueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },

  issueButtonPressed: {
    opacity: 0.9,
  },

  issueButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  issueButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.surface,
    marginLeft: SPACING.sm,
  },

  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },

  manageButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
});
