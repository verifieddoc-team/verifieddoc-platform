import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams } from "expo-router";
import {
  Camera,
  CheckCircle2,
  Keyboard,
  RefreshCw,
  ShieldQuestion,
  XCircle,
} from "lucide-react-native";
import { Screen } from "../components/screen";
import { PrimaryButton, SectionHeading, StatusPill } from "../components/ui";
import { useSession } from "../context/session-context";
import { extractVerificationToken, verifyDemoToken } from "../services/demo";
import { mobileApi } from "../services/api";
import { formatDate, humanize } from "../lib/format";
import { colors, radius, shadow, spacing } from "../theme";

export default function VerifyScreen() {
  const params = useLocalSearchParams();
  const { isDemo } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [token, setToken] = useState(
    typeof params.token === "string" ? params.token : "",
  );
  const [result, setResult] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const handledInitial = useRef(false);

  const verify = useCallback(async (value = token) => {
    const normalized = extractVerificationToken(value);
    if (!normalized) return;
    setLoading(true);
    setUnavailable(false);
    setResult(null);
    try {
      const response = isDemo
        ? verifyDemoToken(normalized)
        : await mobileApi.verify(normalized);
      if (!response) {
        setUnavailable(true);
      } else {
        setResult(response);
      }
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [isDemo, token]);

  useEffect(() => {
    if (handledInitial.current || !token) return;
    handledInitial.current = true;
    void verify(token);
  }, [token, verify]);

  async function openScanner() {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) return;
    }
    setScanned(false);
    setScannerOpen(true);
  }

  function handleScan({ data }) {
    if (scanned) return;
    const nextToken = extractVerificationToken(data);
    setScanned(true);
    setScannerOpen(false);
    setToken(nextToken);
    void verify(nextToken);
  }

  return (
    <Screen>
      <SectionHeading
        copy="Scan a holder-approved QR code or enter the token from a shared verification URL."
        eyebrow="Public source confirmation"
        title="Verify a credential"
      />

      {scannerOpen ? (
        <View style={styles.scannerCard}>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
            style={styles.camera}
          />
          <View style={styles.scanFrame} pointerEvents="none" />
          <Text style={styles.scannerText}>
            Keep the QR code inside the frame.
          </Text>
          <PrimaryButton onPress={() => setScannerOpen(false)} secondary>
            Cancel scanning
          </PrimaryButton>
        </View>
      ) : (
        <>
          <View style={styles.options}>
            <Pressable onPress={openScanner} style={styles.option}>
              <View style={styles.optionIcon}>
                <Camera color={colors.indigo} size={24} />
              </View>
              <Text style={styles.optionTitle}>Scan QR code</Text>
              <Text style={styles.optionCopy}>Use the device camera</Text>
            </Pressable>
            <View style={styles.option}>
              <View style={styles.optionIcon}>
                <Keyboard color={colors.teal} size={24} />
              </View>
              <Text style={styles.optionTitle}>Enter token</Text>
              <Text style={styles.optionCopy}>Paste a URL or raw token</Text>
            </View>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Verification token or URL</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              onChangeText={setToken}
              placeholder="Paste holder-approved link or token"
              placeholderTextColor="#96999E"
              style={styles.input}
              value={token}
            />
            <PrimaryButton
              disabled={loading || !token.trim()}
              icon={
                loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <RefreshCw color={colors.white} size={18} />
                )
              }
              onPress={() => verify()}
            >
              {loading ? "Checking source..." : "Verify now"}
            </PrimaryButton>
            {isDemo ? (
              <Pressable
                onPress={() => {
                  const demo = "DEMO-VERIFIED-2026";
                  setToken(demo);
                  void verify(demo);
                }}
              >
                <Text style={styles.demoLink}>Use fictional demo token</Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {result ? <VerificationResult result={result} /> : null}
      {unavailable ? <UnavailableResult /> : null}

      <View style={styles.guidance}>
        <ShieldQuestion color={colors.teal} size={22} />
        <Text style={styles.guidanceText}>
          A result confirms the current issuer-backed record. Employers and
          other verifiers remain responsible for their final decision.
        </Text>
      </View>
    </Screen>
  );
}

function VerificationResult({ result }) {
  const credential = result.credential;
  const positive = result.result === "VALID";
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHead}>
        <View
          style={[
            styles.resultIcon,
            !positive && { backgroundColor: colors.paleWarning },
          ]}
        >
          <CheckCircle2
            color={positive ? colors.success : colors.warning}
            size={28}
          />
        </View>
        <View style={styles.resultHeadCopy}>
          <Text style={styles.resultEyebrow}>Verification result</Text>
          <Text style={styles.resultTitle}>
            {positive ? "Credential confirmed" : humanize(result.result)}
          </Text>
        </View>
        <StatusPill status={result.result} />
      </View>
      <ResultRow label="Credential" value={credential.title} />
      <ResultRow label="Issuer" value={credential.organization.name} />
      <ResultRow label="Public ID" value={credential.publicId} />
      <ResultRow label="Issued" value={formatDate(credential.issuedAt)} />
      <ResultRow label="Expires" value={formatDate(credential.expiresAt)} />
      {credential.holderName ? (
        <ResultRow label="Holder" value={credential.holderName} />
      ) : null}
      {credential.referenceNo ? (
        <ResultRow label="Reference" value={credential.referenceNo} />
      ) : null}
      {credential.claims
        ? Object.entries(credential.claims).map(([key, value]) => (
            <ResultRow
              key={key}
              label={humanize(key)}
              value={String(value)}
            />
          ))
        : null}
    </View>
  );
}

function ResultRow({ label, value }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

function UnavailableResult() {
  return (
    <View style={styles.unavailable}>
      <XCircle color={colors.error} size={30} />
      <Text style={styles.unavailableTitle}>Verification unavailable</Text>
      <Text style={styles.unavailableCopy}>
        The link may be invalid, expired, revoked, or fully used. VerifiedDoc
        returns the same safe response in each case.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  option: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 99,
    height: 48,
    justifyContent: "center",
    marginBottom: spacing.xs,
    width: 48,
  },
  optionTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  optionCopy: {
    color: colors.gray,
    fontSize: 11,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    gap: spacing.md,
    padding: spacing.md,
    ...shadow,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    minHeight: 90,
    padding: 14,
    textAlignVertical: "top",
  },
  demoLink: {
    color: colors.teal,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  scannerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
  },
  camera: {
    borderRadius: radius.md,
    height: 390,
    overflow: "hidden",
  },
  scanFrame: {
    borderColor: colors.gold,
    borderRadius: radius.md,
    borderWidth: 3,
    height: 220,
    left: "19%",
    position: "absolute",
    top: 100,
    width: "62%",
  },
  scannerText: {
    color: colors.gray,
    fontSize: 12,
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    gap: 0,
    padding: spacing.lg,
    ...shadow,
  },
  resultHead: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  resultIcon: {
    alignItems: "center",
    backgroundColor: colors.paleSuccess,
    borderRadius: 99,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  resultHeadCopy: {
    flex: 1,
  },
  resultEyebrow: {
    color: colors.gray,
    fontSize: 10,
    textTransform: "uppercase",
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 3,
  },
  resultRow: {
    alignItems: "flex-start",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  resultLabel: {
    color: colors.gray,
    fontSize: 12,
  },
  resultValue: {
    color: colors.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  unavailable: {
    alignItems: "center",
    backgroundColor: colors.paleError,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  unavailableTitle: {
    color: colors.error,
    fontSize: 17,
    fontWeight: "800",
  },
  unavailableCopy: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  guidance: {
    alignItems: "flex-start",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  guidanceText: {
    color: colors.gray,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
