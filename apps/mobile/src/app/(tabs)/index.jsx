import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Camera,
  ChevronRight,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react-native";
import { Screen } from "../../components/screen";
import {
  Brand,
  CredentialCard,
  EmptyState,
  SectionHeading,
} from "../../components/ui";
import { useSession } from "../../context/session-context";
import { useWallet } from "../../context/wallet-context";
import { colors, radius, shadow, spacing } from "../../theme";

export default function HomeScreen() {
  const router = useRouter();
  const { session, isDemo } = useSession();
  const { credentials, loading, error, refresh } = useWallet();
  const active = credentials.filter(
    (credential) => credential.effectiveStatus === "ACTIVE",
  ).length;

  return (
    <Screen>
      <View style={styles.top}>
        <Brand compact />
        <Pressable
          accessibilityLabel="Refresh wallet"
          onPress={refresh}
          style={styles.iconButton}
        >
          <RefreshCw color={colors.indigo} size={19} />
        </Pressable>
      </View>

      <View style={styles.welcome}>
        <View>
          <Text style={styles.welcomeEyebrow}>
            {isDemo ? "Fictional demonstration" : "Credential holder"}
          </Text>
          <Text style={styles.welcomeTitle}>
            Welcome, {session?.user.firstName}
          </Text>
          <Text style={styles.welcomeCopy}>
            Your issuer-backed records are ready when you are.
          </Text>
        </View>
        <View style={styles.welcomeMark}>
          <ShieldCheck color={colors.white} size={32} />
        </View>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{credentials.length}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {active}
          </Text>
          <Text style={styles.metricLabel}>Active</Text>
        </View>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.warning }]}>
            {credentials.length - active}
          </Text>
          <Text style={styles.metricLabel}>Other</Text>
        </View>
      </View>

      <View style={styles.quickGrid}>
        <QuickAction
          Icon={Camera}
          copy="Scan or enter a token"
          onPress={() => router.push("/verify")}
          title="Verify"
        />
        <QuickAction
          Icon={Share2}
          copy="Create a limited link"
          onPress={() => router.push("/(tabs)/share")}
          title="Share"
        />
      </View>

      <SectionHeading
        action={
          <Pressable onPress={() => router.push("/(tabs)/credentials")}>
            <Text style={styles.textAction}>View all</Text>
          </Pressable>
        }
        eyebrow="Recent records"
        title="Credential wallet"
      />

      {loading ? <ActivityIndicator color={colors.indigo} /> : null}
      {error ? (
        <View style={styles.error}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {!loading && credentials.length === 0 ? (
        <EmptyState
          copy="Credentials issued to your account will appear here."
          title="No credentials yet"
        />
      ) : (
        credentials.slice(0, 2).map((credential) => (
          <CredentialCard
            credential={credential}
            key={credential.id}
            onPress={() => router.push(`/credential/${credential.id}`)}
          />
        ))
      )}

      <View style={styles.assurance}>
        <ShieldCheck color={colors.teal} size={22} />
        <View style={styles.assuranceCopy}>
          <Text style={styles.assuranceTitle}>Connected to the issuer</Text>
          <Text style={styles.assuranceText}>
            Status, expiry, and revocation are shown from the live source
            record.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function QuickAction({ Icon, title, copy, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
    >
      <View style={styles.quickIcon}>
        <Icon color={colors.indigo} size={21} />
      </View>
      <View style={styles.quickCopy}>
        <Text style={styles.quickTitle}>{title}</Text>
        <Text style={styles.quickText}>{copy}</Text>
      </View>
      <ChevronRight color={colors.gray} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  welcome: {
    alignItems: "center",
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: spacing.lg,
  },
  welcomeEyebrow: {
    color: "#C8D7EA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  welcomeTitle: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
    marginTop: 5,
  },
  welcomeCopy: {
    color: "#DFE7F1",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 235,
  },
  welcomeMark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 99,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  metrics: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    flexDirection: "row",
    paddingVertical: spacing.md,
    ...shadow,
  },
  metric: {
    alignItems: "center",
    borderRightColor: colors.divider,
    borderRightWidth: 1,
    flex: 1,
    gap: 2,
  },
  metricValue: {
    color: colors.indigo,
    fontSize: 22,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.gray,
    fontSize: 11,
    fontWeight: "600",
  },
  quickGrid: {
    gap: spacing.sm,
  },
  quick: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  quickIcon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  quickCopy: {
    flex: 1,
  },
  quickTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  quickText: {
    color: colors.gray,
    fontSize: 12,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.75,
  },
  textAction: {
    color: colors.indigo,
    fontSize: 12,
    fontWeight: "800",
  },
  error: {
    backgroundColor: colors.paleError,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  assurance: {
    alignItems: "flex-start",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  assuranceCopy: {
    flex: 1,
  },
  assuranceTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  assuranceText: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
});
