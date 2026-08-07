import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import {
  useFocusEffect,
  useRouter,
} from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import { verifyCredential } from "../../services/verifierService";

export default function VerifyScreen() {
  const router = useRouter();

  const [permission, requestPermission] =
    useCameraPermissions();

  const [isFocused, setIsFocused] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);

      return () => {
        setIsFocused(false);
      };
    }, [])
  );

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || verifying) return;

    setScanned(true);
    setVerifying(true);
    setError("");
    setResult(null);

    try {
      const verification =
        await verifyCredential(data);

      setResult(verification);
    } catch (scanError) {
      setError(
        scanError?.message ??
          "Unable to verify this credential."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleScanAgain = () => {
    setResult(null);
    setError("");
    setScanned(false);
  };

  const formatDate = (value) => {
    if (!value) return "No expiry";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialIcons
          name="photo-camera"
          size={54}
          color={COLORS.secondary}
        />

        <Text style={styles.permissionTitle}>
          Camera access required
        </Text>

        <Text style={styles.permissionText}>
          VerifiedDoc uses your camera only to
          scan credential verification QR codes.
        </Text>

        <Pressable
          style={styles.primaryButton}
          onPress={requestPermission}
        >
          <Text style={styles.primaryButtonText}>
            Allow Camera
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            Scan Credential
          </Text>

          <Text style={styles.headerSubtitle}>
            Verify a VerifiedDoc QR code
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        {!result && !error ? (
          <>
            <Text style={styles.instructions}>
              Position the credential QR code
              inside the frame.
            </Text>

            <View style={styles.cameraContainer}>
              {isFocused ? (
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                  onBarcodeScanned={
                    scanned
                      ? undefined
                      : handleBarcodeScanned
                  }
                />
              ) : (
                <View style={styles.cameraInactive} />
              )}

              <View style={styles.scanOverlay}>
                <View style={styles.scanFrame} />
              </View>
            </View>

            {verifying ? (
              <View style={styles.verifyingBox}>
                <ActivityIndicator
                  color={COLORS.secondary}
                />

                <Text style={styles.verifyingText}>
                  Verifying credential...
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {result ? (
          <View
            style={[
              styles.resultCard,
              result.result === "VALID"
                ? styles.resultValid
                : styles.resultInvalid,
            ]}
          >
            <MaterialIcons
              name={
                result.result === "VALID"
                  ? "verified"
                  : "error-outline"
              }
              size={50}
              color={
                result.result === "VALID"
                  ? "#247A43"
                  : COLORS.error
              }
            />

            <Text
              style={[
                styles.resultStatus,
                result.result === "VALID"
                  ? styles.resultStatusValid
                  : styles.resultStatusInvalid,
              ]}
            >
              {result.result}
            </Text>

            <Text style={styles.credentialTitle}>
              {result.credential?.title ??
                "Credential"}
            </Text>

            <Text style={styles.issuer}>
              {result.credential?.organization
                ?.name ?? "Unknown issuer"}
            </Text>

            <View style={styles.divider} />

            <DetailRow
              label="Status"
              value={
                result.credential
                  ?.effectiveStatus
              }
            />

            <DetailRow
              label="Type"
              value={
                result.credential
                  ?.credentialType
              }
            />

            <DetailRow
              label="Issued"
              value={formatDate(
                result.credential?.issuedAt
              )}
            />

            <DetailRow
              label="Expires"
              value={formatDate(
                result.credential?.expiresAt
              )}
            />

            <DetailRow
              label="Public ID"
              value={
                result.credential?.publicId
              }
            />

            {result.credential?.holderName ? (
              <DetailRow
                label="Holder"
                value={
                  result.credential.holderName
                }
              />
            ) : null}

            {result.credential?.referenceNo ? (
              <DetailRow
                label="Reference"
                value={
                  result.credential.referenceNo
                }
              />
            ) : null}

            <Pressable
              style={styles.primaryButton}
              onPress={handleScanAgain}
            >
              <MaterialIcons
                name="qr-code-scanner"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.primaryButtonText}>
                Scan Another
              </Text>
            </Pressable>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <MaterialIcons
              name="error-outline"
              size={50}
              color={COLORS.error}
            />

            <Text style={styles.errorTitle}>
              Verification unavailable
            </Text>

            <Text style={styles.errorText}>
              {error}
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={handleScanAgain}
            >
              <Text style={styles.primaryButtonText}>
                Try Again
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          style={styles.manualButton}
          onPress={() =>
            router.push("/verifier")
          }
        >
          <MaterialIcons
            name="keyboard"
            size={20}
            color={COLORS.secondary}
          />

          <Text style={styles.manualButtonText}>
            Verify by link or token instead
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text style={styles.detailValue}>
        {value ?? "Not available"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xl,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#DCE4F2",
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  instructions: {
    marginBottom: SPACING.md,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  cameraContainer: {
    height: 380,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#111111",
  },
  camera: {
    flex: 1,
  },
  cameraInactive: {
    flex: 1,
    backgroundColor: "#111111",
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: 230,
    height: 230,
    borderWidth: 3,
    borderRadius: 18,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
  verifyingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: SPACING.md,
  },
  verifyingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  permissionTitle: {
    marginTop: SPACING.md,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },
  permissionText: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  resultCard: {
    alignItems: "center",
    padding: SPACING.lg,
    borderWidth: 1,
    borderRadius: 16,
  },
  resultValid: {
    backgroundColor: "#EDF8F1",
    borderColor: "#8AC7A0",
  },
  resultInvalid: {
    backgroundColor: "#FFF1EF",
    borderColor: "#DCA19A",
  },
  resultStatus: {
    marginTop: SPACING.sm,
    fontSize: 22,
    fontWeight: "700",
  },
  resultStatusValid: {
    color: "#247A43",
  },
  resultStatusInvalid: {
    color: COLORS.error,
  },
  credentialTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.text,
  },
  issuer: {
    marginTop: 4,
    fontSize: 13,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  divider: {
    width: "100%",
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.border,
  },
  detailRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    flex: 1.4,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    color: COLORS.text,
  },
  primaryButton: {
    minHeight: 48,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: COLORS.secondary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  errorCard: {
    alignItems: "center",
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: "#DCA19A",
    borderRadius: 16,
    backgroundColor: "#FFF1EF",
  },
  errorTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.error,
  },
  errorText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
});
