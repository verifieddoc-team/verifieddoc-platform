import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
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
function formatVerificationDate(value) {
  if (!value) return "No expiry";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString();
}
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
  verificationResult,
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
       {verificationResult ? (
  <View
    style={[
      styles.resultCard,
      verificationResult.result === "VALID"
        ? styles.resultCardValid
        : styles.resultCardInvalid,
    ]}
  >
    <Text
      style={[
        styles.resultStatus,
        verificationResult.result === "VALID"
          ? styles.resultStatusValid
          : styles.resultStatusInvalid,
      ]}
    >
      {verificationResult.result === "VALID"
        ? "✓ VALID"
        : `⚠ ${verificationResult.result}`}
    </Text>

    <Text style={styles.resultTitle}>
      {verificationResult.credential?.title ??
        "Credential"}
    </Text>

    <Text style={styles.resultIssuer}>
      {verificationResult.credential?.organization
        ?.name ?? "Unknown issuer"}
    </Text>

    <View style={styles.resultDivider} />

    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>
        Credential status
      </Text>
      <Text style={styles.resultValue}>
        {verificationResult.credential
          ?.effectiveStatus ?? "Unknown"}
      </Text>
    </View>

    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>Type</Text>
      <Text style={styles.resultValue}>
        {verificationResult.credential
          ?.credentialType ?? "Not available"}
      </Text>
    </View>

    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>Issued</Text>
      <Text style={styles.resultValue}>
        {formatVerificationDate(
          verificationResult.credential?.issuedAt
        )}
      </Text>
    </View>

    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>Expires</Text>
      <Text style={styles.resultValue}>
        {formatVerificationDate(
          verificationResult.credential?.expiresAt
        )}
      </Text>
    </View>

    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>Public ID</Text>
      <Text style={styles.resultValue}>
        {verificationResult.credential?.publicId ??
          "Not available"}
      </Text>
    </View>

    {verificationResult.credential?.holderName ? (
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>
          Credential holder
        </Text>
        <Text style={styles.resultValue}>
          {verificationResult.credential.holderName}
        </Text>
      </View>
    ) : null}

    {verificationResult.credential?.referenceNo ? (
      <View style={styles.resultRow}>
        <Text style={styles.resultLabel}>
          Reference
        </Text>
        <Text style={styles.resultValue}>
          {verificationResult.credential.referenceNo}
        </Text>
      </View>
    ) : null}
  </View>
) : null}
       {verifyError ? (
  <View style={styles.verifyErrorWrap}>
    <EmptyState
      icon="error-outline"
      message={verifyError}
    />
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
    resultCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultCardValid: {
    backgroundColor: "#EDF8F1",
    borderColor: "#8AC7A0",
  },
  resultCardInvalid: {
    backgroundColor: "#FFF1EF",
    borderColor: "#DCA19A",
  },
  resultStatus: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginBottom: SPACING.sm,
  },
  resultStatusValid: {
    color: "#247A43",
  },
  resultStatusInvalid: {
    color: COLORS.error,
  },
  resultTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
  },
  resultIssuer: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  resultDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  resultLabel: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  resultValue: {
    flex: 1.3,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: COLORS.text,
    textAlign: "right",
  },
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
