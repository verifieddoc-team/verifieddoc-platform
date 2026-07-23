import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import QRCode from "react-native-qrcode-svg";
import type {
  AuthSession,
  CredentialStatus,
  PublicVerificationResponse,
  SafeCredential,
} from "@verifieddoc/contracts";
import { ApiError, mobileApi } from "./src/api";
import {
  demoSession,
  demoVerification,
  demoWallet,
  verifyDemoToken,
} from "./src/demo";
import { clearSession, readSession, saveSession } from "./src/session";

const colors = {
  navy: "#0B1F33",
  navySoft: "#173A55",
  emerald: "#0F8A63",
  emeraldDark: "#0B7353",
  mint: "#E3F2EC",
  cream: "#F7F3EA",
  white: "#FFFFFF",
  slate: "#5F6B73",
  gold: "#C5A86A",
  border: "#D8D0C2",
  danger: "#B55252",
};

const demoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false";

type Tab = "wallet" | "share" | "verify" | "profile";

function formatDate(value: string | null) {
  if (!value) return "No expiry";
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: CredentialStatus | string }) {
  const good = ["ACTIVE", "VALID"].includes(status);
  const warning = status === "EXPIRED";
  return (
    <View
      style={[
        styles.statusPill,
        good
          ? styles.statusGood
          : warning
            ? styles.statusWarning
            : styles.statusDanger,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          good
            ? styles.statusGoodText
            : warning
              ? styles.statusWarningText
              : styles.statusDangerText,
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <Text style={styles.brandCheck}>✓</Text>
      </View>
      <Text style={styles.brandText}>VerifiedDoc</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function LoginScreen({
  onLogin,
}: {
  onLogin: (session: AuthSession, isDemo: boolean) => void;
}) {
  const [email, setEmail] = useState("demo.holder@example.test");
  const [password, setPassword] = useState("DemoPass1!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    setLoading(true);
    setError("");
    try {
      const session = await mobileApi.login(email.trim(), password);
      await saveSession(session);
      onLogin(session, false);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The API is unavailable. Use the fictional demo to continue.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navy} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.loginKeyboard}
      >
        <ScrollView
          contentContainerStyle={styles.loginScroll}
          keyboardShouldPersistTaps="handled"
        >
          <Brand />
          <View style={styles.loginHero}>
            <Text style={styles.eyebrow}>ISSUER-BACKED CREDENTIALS</Text>
            <Text style={styles.loginTitle}>Your verified records, carried with you.</Text>
            <Text style={styles.loginCopy}>
              Keep credentials in one wallet and share them only with your
              consent.
            </Text>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.cardEyebrow}>HOLDER ACCESS</Text>
            <Text style={styles.loginCardTitle}>Sign in</Text>
            <Text style={styles.loginCardCopy}>
              Use your VerifiedDoc account or open the fictional demo.
            </Text>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              style={styles.input}
              value={email}
            />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              value={password}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <PrimaryButton
              disabled={loading}
              label={loading ? "Signing in..." : "Sign in securely"}
              onPress={login}
            />
            {demoMode ? (
              <>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>OR</Text>
                  <View style={styles.orLine} />
                </View>
                <Pressable
                  onPress={() => onLogin(demoSession, true)}
                  style={styles.demoButton}
                >
                  <Text style={styles.demoButtonText}>Open fictional holder demo</Text>
                </Pressable>
              </>
            ) : null}
            <Text style={styles.securityNote}>
              Production sessions are kept in device-secure storage.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScreenHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderCopy}>
        <Text style={styles.screenEyebrow}>{eyebrow}</Text>
        <Text style={styles.screenTitle}>{title}</Text>
        <Text style={styles.screenCopy}>{copy}</Text>
      </View>
      {action}
    </View>
  );
}

function WalletScreen({
  credentials,
  onSelect,
}: {
  credentials: SafeCredential[];
  onSelect: (credential: SafeCredential) => void;
}) {
  const active = credentials.filter(
    (credential) => credential.effectiveStatus === "ACTIVE",
  ).length;
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <ScreenHeader
        copy="Every record stays connected to its issuing organization."
        eyebrow="HOLDER WALLET"
        title="Your credentials"
      />
      <View style={styles.mobileMetricRow}>
        <View style={styles.mobileMetric}>
          <Text style={styles.mobileMetricValue}>{credentials.length}</Text>
          <Text style={styles.mobileMetricLabel}>Total records</Text>
        </View>
        <View style={[styles.mobileMetric, styles.mobileMetricGreen]}>
          <Text style={styles.mobileMetricValue}>{active}</Text>
          <Text style={styles.mobileMetricLabel}>Active</Text>
        </View>
      </View>
      <Text style={styles.sectionHeading}>Credential wallet</Text>
      {credentials.length === 0 ? (
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>No credentials yet</Text>
          <Text style={styles.infoPanelCopy}>
            Credentials issued to this account will appear here automatically.
          </Text>
        </View>
      ) : null}
      {credentials.map((credential) => (
        <Pressable
          key={credential.id}
          onPress={() => onSelect(credential)}
          style={({ pressed }) => [
            styles.mobileCredential,
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.mobileCredentialTop}>
            <View style={styles.credentialIcon}>
              <Text style={styles.credentialIconText}>VD</Text>
            </View>
            <StatusPill status={credential.effectiveStatus} />
          </View>
          <Text style={styles.credentialType}>
            {credential.credentialType.replaceAll("_", " ")}
          </Text>
          <Text style={styles.credentialTitle}>{credential.title}</Text>
          <Text style={styles.credentialIssuer}>{credential.organization.name}</Text>
          <View style={styles.mobileCredentialFooter}>
            <Text style={styles.mobileCredentialDate}>
              Issued {formatDate(credential.issuedAt)}
            </Text>
            <Text style={styles.mobileCredentialLink}>View record →</Text>
          </View>
        </Pressable>
      ))}
      <View style={styles.infoPanel}>
        <Text style={styles.infoPanelTitle}>What your wallet proves</Text>
        <Text style={styles.infoPanelCopy}>
          The wallet displays structured records from approved organizations.
          It does not replace an employer&apos;s independent decision.
        </Text>
      </View>
    </ScrollView>
  );
}

function CredentialDetailScreen({
  credential,
  onBack,
  onShare,
}: {
  credential: SafeCredential;
  onBack: () => void;
  onShare: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <Pressable onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Wallet</Text>
      </Pressable>
      <View style={styles.documentCard}>
        <View style={styles.documentTop}>
          <StatusPill status={credential.effectiveStatus} />
          <Text style={styles.documentPublicId}>{credential.publicId}</Text>
        </View>
        <Text style={styles.documentEyebrow}>VERIFIED CREDENTIAL</Text>
        <Text style={styles.documentTitle}>{credential.title}</Text>
        <Text style={styles.documentCopy}>{credential.description}</Text>
        <View style={styles.issuerRow}>
          <View style={styles.issuerLogo}>
            <Text style={styles.issuerLogoText}>N</Text>
          </View>
          <View>
            <Text style={styles.issuerLabel}>ISSUED BY</Text>
            <Text style={styles.issuerName}>{credential.organization.name}</Text>
          </View>
        </View>
        <View style={styles.detailGrid}>
          <Detail label="Reference" value={credential.referenceNo} />
          <Detail label="Issued" value={formatDate(credential.issuedAt)} />
          <Detail label="Expires" value={formatDate(credential.expiresAt)} />
          <Detail
            label="Type"
            value={credential.credentialType.replaceAll("_", " ")}
          />
        </View>
      </View>
      <View style={styles.claimCard}>
        <Text style={styles.sectionHeading}>Structured claims</Text>
        {credential.claims
          ? Object.entries(credential.claims).map(([key, value]) => (
              <View key={key} style={styles.claimRow}>
                <Text style={styles.claimKey}>{key}</Text>
                <Text style={styles.claimValue}>{String(value)}</Text>
              </View>
            ))
          : null}
      </View>
      {credential.effectiveStatus === "ACTIVE" ? (
        <PrimaryButton label="Share with consent" onPress={onShare} />
      ) : (
        <View style={styles.warningPanel}>
          <Text style={styles.warningTitle}>Sharing unavailable</Text>
          <Text style={styles.warningCopy}>
            Only active credentials can create a new share link.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailCell}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function ShareScreen({
  credential,
  accessToken,
  demo,
}: {
  credential: SafeCredential;
  accessToken: string;
  demo: boolean;
}) {
  const [includeName, setIncludeName] = useState(false);
  const [includeReference, setIncludeReference] = useState(false);
  const [link, setLink] = useState("");
  const [views, setViews] = useState("10");
  const [duration, setDuration] = useState("72");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createLink() {
    setLoading(true);
    setError("");
    try {
      if (demo) {
        setLink("https://verifieddoc.example.test/verify/DEMO-VERIFIED-2026");
        return;
      }
      const response = await mobileApi.createShareLink(
        accessToken,
        credential.id,
        {
          expiresInHours: Number(duration),
          maxViews: Number(views),
          disclosedClaims: Object.keys(credential.claims ?? {}),
          includeHolderName: includeName,
          includeReferenceNo: includeReference,
        },
      );
      setLink(response.verificationUrl);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "The share link could not be created.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <ScreenHeader
        copy="Choose what the verifier can see and how long access lasts."
        eyebrow="CONSENT SHARING"
        title="Create a secure link"
      />
      <View style={styles.shareCredentialSummary}>
        <View style={styles.credentialIcon}>
          <Text style={styles.credentialIconText}>VD</Text>
        </View>
        <View style={styles.shareSummaryCopy}>
          <Text style={styles.shareSummaryTitle}>{credential.title}</Text>
          <Text style={styles.shareSummaryIssuer}>
            {credential.organization.name}
          </Text>
        </View>
        <StatusPill status={credential.effectiveStatus} />
      </View>
      <View style={styles.formPanel}>
        <Text style={styles.sectionHeading}>Access limits</Text>
        <Text style={styles.inputLabel}>Duration in hours</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setDuration}
          style={styles.input}
          value={duration}
        />
        <Text style={styles.inputLabel}>Maximum views</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setViews}
          style={styles.input}
          value={views}
        />
        <Text style={styles.sectionHeading}>Identity disclosure</Text>
        <ToggleRow
          copy="Show the holder's name to the verifier."
          label="Include holder name"
          onValueChange={setIncludeName}
          value={includeName}
        />
        <ToggleRow
          copy="Show the organization's internal reference number."
          label="Include reference number"
          onValueChange={setIncludeReference}
          value={includeReference}
        />
        <Text style={styles.sectionHeading}>Claims</Text>
        {Object.keys(credential.claims ?? {}).map((claim) => (
          <View key={claim} style={styles.fixedClaim}>
            <Text style={styles.fixedClaimCheck}>✓</Text>
            <Text style={styles.fixedClaimText}>{claim}</Text>
          </View>
        ))}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton
          disabled={loading}
          label={loading ? "Creating secure link..." : "Create one-time share URL"}
          onPress={() => void createLink()}
        />
      </View>
      {link ? (
        <View style={styles.qrPanel}>
          <Text style={styles.qrEyebrow}>COPY OR SCAN NOW</Text>
          <Text style={styles.qrTitle}>Share link created</Text>
          <View style={styles.qrWrap}>
            <QRCode
              backgroundColor={colors.white}
              color={colors.navy}
              size={190}
              value={link}
            />
          </View>
          <Text selectable style={styles.shareUrl}>{link}</Text>
          <Text style={styles.securityNote}>
            The API returns the raw token only once. Only its hash is stored.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ToggleRow({
  label,
  copy,
  value,
  onValueChange,
}: {
  label: string;
  copy: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleDescription}>{copy}</Text>
      </View>
      <Switch
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: "#D7D1C8", true: colors.emerald }}
        value={value}
      />
    </View>
  );
}

function VerifyScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [token, setToken] = useState("DEMO-VERIFIED-2026");
  const [result, setResult] = useState<PublicVerificationResponse | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);

  async function verify(value = token) {
    setLoading(true);
    setUnavailable(false);
    try {
      const response = demoMode
        ? verifyDemoToken(value)
        : await mobileApi.verify(value);
      setResult(response);
      setUnavailable(!response);
    } catch {
      setResult(null);
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        Alert.alert(
          "Camera permission needed",
          "You can still enter the verification token manually.",
        );
        return;
      }
    }
    setScanned(false);
    setScannerOpen(true);
  }

  if (scannerOpen) {
    return (
      <View style={styles.cameraScreen}>
        <CameraView
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  setToken(data);
                  setScannerOpen(false);
                  void verify(data);
                }
          }
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView style={styles.cameraOverlay}>
          <Pressable
            onPress={() => setScannerOpen(false)}
            style={styles.cameraClose}
          >
            <Text style={styles.cameraCloseText}>Close</Text>
          </Pressable>
          <View style={styles.cameraFrame} />
          <Text style={styles.cameraHelp}>
            Place the VerifiedDoc QR code inside the frame.
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <ScreenHeader
        copy="Scan a holder-approved QR code or enter its token."
        eyebrow="PUBLIC VERIFICATION"
        title="Check a credential"
        action={
          <Pressable onPress={openScanner} style={styles.scanButton}>
            <Text style={styles.scanButtonText}>▦ Scan</Text>
          </Pressable>
        }
      />
      <View style={styles.formPanel}>
        <Text style={styles.inputLabel}>Verification token</Text>
        <TextInput
          autoCapitalize="characters"
          onChangeText={setToken}
          style={styles.input}
          value={token}
        />
        <PrimaryButton
          disabled={loading}
          label={loading ? "Checking..." : "Verify record"}
          onPress={() => void verify()}
        />
      </View>
      {result ? (
        <View style={styles.mobileVerification}>
          <View style={styles.mobileVerificationHeader}>
            <View style={styles.resultCheck}>
              <Text style={styles.resultCheckText}>✓</Text>
            </View>
            <View>
              <Text style={styles.resultEyebrow}>VERIFICATION RESULT</Text>
              <Text style={styles.resultTitle}>Credential verified</Text>
            </View>
          </View>
          <Detail label="Credential" value={result.credential.title} />
          <Detail label="Issuer" value={result.credential.organization.name} />
          <Detail label="Status" value={result.credential.effectiveStatus} />
          <Detail label="Issued" value={formatDate(result.credential.issuedAt)} />
          <View style={styles.resultSafety}>
            <Text style={styles.resultSafetyText}>
              ✓ Holder-approved disclosure only
            </Text>
          </View>
        </View>
      ) : unavailable ? (
        <View style={styles.mobileUnavailable}>
          <Text style={styles.unavailableMark}>!</Text>
          <Text style={styles.unavailableTitle}>Verification unavailable</Text>
          <Text style={styles.unavailableCopy}>
            The link may be invalid, expired, revoked, or fully used. No
            additional details are exposed.
          </Text>
          <Pressable
            onPress={() => {
              setToken("DEMO-VERIFIED-2026");
              setResult(demoVerification);
              setUnavailable(false);
            }}
          >
            <Text style={styles.demoLink}>Use fictional demo token</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.verifyReady}>
          <Text style={styles.readyMark}>✓</Text>
          <Text style={styles.readyTitle}>Ready to verify</Text>
          <Text style={styles.readyCopy}>
            Verification confirms the source record. The employer makes the
            final independent decision.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ProfileScreen({
  session,
  demo,
  onLogout,
}: {
  session: AuthSession;
  demo: boolean;
  onLogout: () => void;
}) {
  const user = session.user;
  return (
    <ScrollView contentContainerStyle={styles.screenScroll}>
      <ScreenHeader
        copy="Basic account information and secure session controls."
        eyebrow="ACCOUNT"
        title="Your profile"
      />
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {user.firstName[0]}
            {user.lastName[0]}
          </Text>
        </View>
        <Text style={styles.profileName}>
          {user.firstName} {user.lastName}
        </Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <StatusPill status={user.role} />
      </View>
      <View style={styles.claimCard}>
        <Text style={styles.sectionHeading}>Session security</Text>
        <View style={styles.securityRow}>
          <Text style={styles.securityRowMark}>✓</Text>
          <View>
            <Text style={styles.securityRowTitle}>
              {demo ? "Fictional demo session" : "Secure device storage"}
            </Text>
            <Text style={styles.securityRowCopy}>
              {demo
                ? "No real authentication token is used in this workspace."
                : "Authentication tokens are not stored in ordinary application preferences."}
            </Text>
          </View>
        </View>
        <View style={styles.securityRow}>
          <Text style={styles.securityRowMark}>✓</Text>
          <View>
            <Text style={styles.securityRowTitle}>Consent-first sharing</Text>
            <Text style={styles.securityRowCopy}>
              Your profile email is never included in public verification.
            </Text>
          </View>
        </View>
      </View>
      <Pressable onPress={onLogout} style={styles.logoutButton}>
        <Text style={styles.logoutButtonText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function BottomTabs({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  const tabs: Array<[Tab, string, string]> = [
    ["wallet", "▣", "Wallet"],
    ["share", "↗", "Share"],
    ["verify", "✓", "Verify"],
    ["profile", "○", "Profile"],
  ];
  return (
    <View style={styles.bottomTabs}>
      {tabs.map(([tab, icon, label]) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: active === tab }}
          key={tab}
          onPress={() => onChange(tab)}
          style={styles.bottomTab}
        >
          <Text
            style={[
              styles.bottomTabIcon,
              active === tab && styles.bottomTabActive,
            ]}
          >
            {icon}
          </Text>
          <Text
            style={[
              styles.bottomTabLabel,
              active === tab && styles.bottomTabActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MobileApp({
  session,
  demo,
  credentials,
  onLogout,
}: {
  session: AuthSession;
  demo: boolean;
  credentials: SafeCredential[];
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<Tab>("wallet");
  const [selected, setSelected] = useState<SafeCredential | null>(null);
  const activeShareCredential =
    selected?.effectiveStatus === "ACTIVE"
      ? selected
      : credentials.find(
          (credential) => credential.effectiveStatus === "ACTIVE",
        ) ?? credentials[0]!;

  let content: React.ReactNode;
  if (selected && tab === "wallet") {
    content = (
      <CredentialDetailScreen
        credential={selected}
        onBack={() => setSelected(null)}
        onShare={() => setTab("share")}
      />
    );
  } else if (tab === "wallet") {
    content = (
      <WalletScreen credentials={credentials} onSelect={setSelected} />
    );
  } else if (tab === "share" && activeShareCredential) {
    content = (
      <ShareScreen
        accessToken={session.accessToken}
        credential={activeShareCredential}
        demo={demo}
      />
    );
  } else if (tab === "share") {
    content = (
      <ScrollView contentContainerStyle={styles.screenScroll}>
        <ScreenHeader
          copy="An active credential is required before a share link can be created."
          eyebrow="CONSENT SHARING"
          title="Nothing available to share"
        />
        <View style={styles.infoPanel}>
          <Text style={styles.infoPanelTitle}>No active credentials</Text>
          <Text style={styles.infoPanelCopy}>
            Ask the issuing organization to issue or renew a credential.
          </Text>
        </View>
      </ScrollView>
    );
  } else if (tab === "verify") {
    content = <VerifyScreen />;
  } else {
    content = (
      <ProfileScreen demo={demo} onLogout={onLogout} session={session} />
    );
  }

  return (
    <SafeAreaView style={styles.appSafeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.cream} />
      <View style={styles.mobileTopbar}>
        <Brand />
        {demo ? <Text style={styles.demoBadge}>DEMO</Text> : null}
      </View>
      <View style={styles.mobileContent}>{content}</View>
      <BottomTabs
        active={tab}
        onChange={(next) => {
          setTab(next);
          if (next !== "wallet") setSelected(null);
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [demo, setDemo] = useState(false);
  const [credentials, setCredentials] = useState<SafeCredential[]>([]);
  const [walletLoaded, setWalletLoaded] = useState(false);

  useEffect(() => {
    async function boot() {
      const stored = await readSession();
      if (stored) setSession(stored);
      setBooting(false);
    }
    void boot();
  }, []);

  useEffect(() => {
    if (!session) {
      setCredentials([]);
      setWalletLoaded(false);
      return;
    }
    if (demo) {
      setCredentials(demoWallet);
      setWalletLoaded(true);
      return;
    }
    setWalletLoaded(false);
    mobileApi
      .wallet(session.accessToken)
      .then((response) => setCredentials(response.data))
      .catch(() => {
        Alert.alert(
          "Wallet unavailable",
          "The credential wallet could not be loaded.",
        );
      })
      .finally(() => setWalletLoaded(true));
  }, [demo, session]);

  const ready = useMemo(
    () => Boolean(session && (demo || walletLoaded)),
    [demo, session, walletLoaded],
  );

  async function logout() {
    await clearSession();
    setSession(null);
    setDemo(false);
    setCredentials([]);
    setWalletLoaded(false);
  }

  if (booting) {
    return (
      <View style={styles.bootScreen}>
        <Brand />
        <ActivityIndicator color={colors.emerald} size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        onLogin={(nextSession, isDemo) => {
          setSession(nextSession);
          setDemo(isDemo);
          if (isDemo) setCredentials(demoWallet);
        }}
      />
    );
  }

  if (!ready) {
    return (
      <View style={styles.bootScreen}>
        <Brand />
        <ActivityIndicator color={colors.emerald} size="large" />
        <Text style={styles.loadingText}>Loading your credential wallet...</Text>
      </View>
    );
  }

  return (
    <MobileApp
      credentials={credentials}
      demo={demo}
      onLogout={() => void logout()}
      session={session}
    />
  );
}

const styles = StyleSheet.create({
  appSafeArea: { backgroundColor: colors.cream, flex: 1 },
  bootScreen: {
    alignItems: "center",
    backgroundColor: colors.cream,
    flex: 1,
    gap: 28,
    justifyContent: "center",
  },
  loadingText: { color: colors.slate, fontSize: 13 },
  brand: { alignItems: "center", flexDirection: "row", gap: 9 },
  brandMark: {
    alignItems: "center",
    borderColor: colors.navy,
    borderRadius: 11,
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    transform: [{ rotate: "45deg" }],
    width: 34,
  },
  brandCheck: {
    color: colors.emerald,
    fontSize: 17,
    fontWeight: "900",
    transform: [{ rotate: "-45deg" }],
  },
  brandText: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -1,
  },
  loginSafeArea: { backgroundColor: colors.navy, flex: 1 },
  loginKeyboard: { flex: 1 },
  loginScroll: { flexGrow: 1, padding: 24, paddingBottom: 42 },
  loginHero: { marginBottom: 30, marginTop: 64 },
  eyebrow: {
    color: "#8BE0C2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  loginTitle: {
    color: colors.white,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 47,
    fontWeight: "500",
    letterSpacing: -2.1,
    lineHeight: 48,
    marginTop: 16,
  },
  loginCopy: {
    color: "#B9C9D5",
    fontSize: 16,
    lineHeight: 25,
    marginTop: 16,
  },
  loginCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
  },
  cardEyebrow: {
    color: colors.emeraldDark,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  loginCardTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 32,
    fontWeight: "600",
    marginTop: 8,
  },
  loginCardCopy: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 18,
    marginTop: 5,
  },
  inputLabel: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 9,
    borderWidth: 1,
    color: colors.navy,
    fontSize: 14,
    minHeight: 49,
    paddingHorizontal: 13,
  },
  errorText: {
    backgroundColor: "#F9E5E5",
    borderRadius: 7,
    color: "#8F3232",
    fontSize: 12,
    marginTop: 12,
    padding: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.emerald,
    borderRadius: 9,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  buttonPressed: { opacity: 0.84, transform: [{ translateY: 1 }] },
  buttonDisabled: { opacity: 0.55 },
  orRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 18,
  },
  orLine: { backgroundColor: "#E7E0D6", flex: 1, height: 1 },
  orText: { color: colors.slate, fontSize: 10, fontWeight: "700" },
  demoButton: {
    alignItems: "center",
    borderColor: colors.navy,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  demoButtonText: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  securityNote: {
    color: colors.slate,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 14,
    textAlign: "center",
  },
  mobileTopbar: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 18,
  },
  demoBadge: {
    backgroundColor: "#F7ECD3",
    borderRadius: 99,
    color: "#805C1B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  mobileContent: { flex: 1 },
  screenScroll: { padding: 18, paddingBottom: 38 },
  screenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  screenHeaderCopy: { flex: 1, paddingRight: 12 },
  screenEyebrow: {
    color: colors.emeraldDark,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  screenTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 36,
    fontWeight: "500",
    letterSpacing: -1.6,
    lineHeight: 39,
    marginTop: 7,
  },
  screenCopy: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  mobileMetricRow: { flexDirection: "row", gap: 10, marginBottom: 26 },
  mobileMetric: {
    backgroundColor: colors.navy,
    borderRadius: 13,
    flex: 1,
    padding: 16,
  },
  mobileMetricGreen: { backgroundColor: colors.emeraldDark },
  mobileMetricValue: {
    color: colors.white,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 30,
    fontWeight: "600",
  },
  mobileMetricLabel: {
    color: "#C4D2DB",
    fontSize: 10,
    marginTop: 5,
  },
  sectionHeading: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 21,
    fontWeight: "600",
    letterSpacing: -0.5,
    marginBottom: 12,
    marginTop: 10,
  },
  mobileCredential: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  cardPressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  mobileCredentialTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  credentialIcon: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 9,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  credentialIconText: { color: colors.white, fontSize: 11, fontWeight: "900" },
  statusPill: { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 6 },
  statusGood: { backgroundColor: "#DFF3EA" },
  statusWarning: { backgroundColor: "#F7ECD3" },
  statusDanger: { backgroundColor: "#F6DFDF" },
  statusText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  statusGoodText: { color: "#087451" },
  statusWarningText: { color: "#8B651E" },
  statusDangerText: { color: "#9B3D3D" },
  credentialType: {
    color: colors.emeraldDark,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  credentialTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 24,
    fontWeight: "600",
    letterSpacing: -0.7,
    lineHeight: 26,
    marginTop: 7,
  },
  credentialIssuer: {
    color: colors.slate,
    fontSize: 12,
    marginTop: 7,
  },
  mobileCredentialFooter: {
    alignItems: "center",
    borderTopColor: "#E7E0D6",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 22,
    paddingTop: 13,
  },
  mobileCredentialDate: { color: colors.slate, fontSize: 10 },
  mobileCredentialLink: {
    color: colors.emeraldDark,
    fontSize: 10,
    fontWeight: "800",
  },
  infoPanel: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    marginTop: 14,
    padding: 18,
  },
  infoPanelTitle: {
    color: colors.white,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 18,
    fontWeight: "600",
  },
  infoPanelCopy: {
    color: "#B9C9D5",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },
  backButton: { marginBottom: 14, paddingVertical: 7 },
  backButtonText: {
    color: colors.emeraldDark,
    fontSize: 12,
    fontWeight: "800",
  },
  documentCard: {
    backgroundColor: "#FFFDF8",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  documentTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  documentPublicId: {
    color: colors.slate,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 9,
  },
  documentEyebrow: {
    color: colors.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginTop: 42,
  },
  documentTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 36,
    fontWeight: "500",
    letterSpacing: -1.5,
    lineHeight: 38,
    marginTop: 8,
  },
  documentCopy: {
    color: colors.slate,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 10,
  },
  issuerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    marginTop: 25,
  },
  issuerLogo: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 24,
    height: 47,
    justifyContent: "center",
    width: 47,
  },
  issuerLogoText: {
    color: colors.emeraldDark,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 20,
    fontWeight: "700",
  },
  issuerLabel: {
    color: colors.slate,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  issuerName: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  detailGrid: { gap: 12, marginTop: 30 },
  detailCell: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  detailLabel: { color: colors.slate, fontSize: 9, fontWeight: "700" },
  detailValue: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4,
  },
  claimCard: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 13,
    padding: 16,
  },
  claimRow: {
    alignItems: "center",
    borderBottomColor: "#E7E0D6",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  claimKey: {
    color: colors.slate,
    fontSize: 11,
    textTransform: "capitalize",
  },
  claimValue: { color: colors.navy, fontSize: 11, fontWeight: "800" },
  warningPanel: {
    backgroundColor: "#F7ECD3",
    borderRadius: 12,
    marginTop: 15,
    padding: 16,
  },
  warningTitle: { color: "#805C1B", fontSize: 13, fontWeight: "800" },
  warningCopy: {
    color: "#805C1B",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  shareCredentialSummary: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  shareSummaryCopy: { flex: 1, marginHorizontal: 12 },
  shareSummaryTitle: { color: colors.navy, fontSize: 13, fontWeight: "800" },
  shareSummaryIssuer: { color: colors.slate, fontSize: 10, marginTop: 3 },
  formPanel: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 13,
    padding: 16,
  },
  toggleRow: {
    alignItems: "center",
    borderBottomColor: "#E7E0D6",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleCopy: { flex: 1, paddingRight: 12 },
  toggleLabel: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  toggleDescription: {
    color: colors.slate,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  fixedClaim: {
    alignItems: "center",
    backgroundColor: colors.mint,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginBottom: 7,
    padding: 10,
  },
  fixedClaimCheck: { color: colors.emeraldDark, fontWeight: "900" },
  fixedClaimText: {
    color: colors.emeraldDark,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  qrPanel: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: 16,
    marginTop: 13,
    padding: 20,
  },
  qrEyebrow: {
    color: "#8BE0C2",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  qrTitle: {
    color: colors.white,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 26,
    fontWeight: "600",
    marginTop: 6,
  },
  qrWrap: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginVertical: 18,
    padding: 13,
  },
  shareUrl: {
    color: "#B9C9D5",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },
  scanButton: {
    backgroundColor: colors.navy,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  scanButtonText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  cameraScreen: { backgroundColor: colors.navy, flex: 1 },
  cameraOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    padding: 24,
  },
  cameraClose: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cameraCloseText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  cameraFrame: {
    borderColor: "#8BE0C2",
    borderRadius: 22,
    borderWidth: 3,
    height: 250,
    width: 250,
  },
  cameraHelp: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 9,
    color: colors.white,
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlign: "center",
  },
  mobileVerification: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 13,
    overflow: "hidden",
    paddingBottom: 16,
  },
  mobileVerificationHeader: {
    alignItems: "center",
    backgroundColor: colors.mint,
    flexDirection: "row",
    gap: 11,
    padding: 16,
  },
  resultCheck: {
    alignItems: "center",
    backgroundColor: colors.emerald,
    borderRadius: 24,
    height: 45,
    justifyContent: "center",
    width: 45,
  },
  resultCheckText: { color: colors.white, fontSize: 20, fontWeight: "900" },
  resultEyebrow: {
    color: colors.emeraldDark,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  resultTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 3,
  },
  resultSafety: { paddingHorizontal: 16, paddingTop: 15 },
  resultSafetyText: {
    color: colors.emeraldDark,
    fontSize: 10,
    fontWeight: "700",
  },
  mobileUnavailable: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 13,
    padding: 28,
  },
  unavailableMark: {
    color: "#8B651E",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 42,
  },
  unavailableTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 24,
    fontWeight: "600",
    marginTop: 8,
  },
  unavailableCopy: {
    color: colors.slate,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
    textAlign: "center",
  },
  demoLink: {
    color: colors.emeraldDark,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 18,
    textDecorationLine: "underline",
  },
  verifyReady: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 13,
    padding: 28,
  },
  readyMark: {
    color: colors.emerald,
    fontSize: 42,
    fontWeight: "900",
  },
  readyTitle: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 24,
    fontWeight: "600",
    marginTop: 8,
  },
  readyCopy: {
    color: colors.slate,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 7,
    textAlign: "center",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 25,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: colors.emerald,
    borderRadius: 38,
    height: 76,
    justifyContent: "center",
    width: 76,
  },
  profileAvatarText: { color: colors.white, fontSize: 25, fontWeight: "900" },
  profileName: {
    color: colors.navy,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
    fontSize: 25,
    fontWeight: "600",
    marginTop: 13,
  },
  profileEmail: { color: colors.slate, fontSize: 11, marginBottom: 12, marginTop: 4 },
  securityRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    paddingVertical: 11,
  },
  securityRowMark: { color: colors.emerald, fontSize: 15, fontWeight: "900" },
  securityRowTitle: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  securityRowCopy: {
    color: colors.slate,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  logoutButton: {
    alignItems: "center",
    borderColor: colors.danger,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    marginTop: 15,
    minHeight: 50,
  },
  logoutButtonText: { color: colors.danger, fontSize: 13, fontWeight: "800" },
  bottomTabs: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 70,
    paddingBottom: Platform.OS === "ios" ? 8 : 0,
  },
  bottomTab: {
    alignItems: "center",
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  bottomTabIcon: { color: colors.slate, fontSize: 18 },
  bottomTabLabel: { color: colors.slate, fontSize: 9, fontWeight: "700" },
  bottomTabActive: { color: colors.emeraldDark },
});
