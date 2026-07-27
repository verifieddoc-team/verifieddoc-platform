import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LockKeyhole, ShieldCheck } from "lucide-react-native";
import { Brand, PrimaryButton } from "../components/ui";
import { Screen } from "../components/screen";
import { useSession } from "../context/session-context";
import { colors, radius, shadow, spacing } from "../theme";

export default function Index() {
  const router = useRouter();
  const { session, initializing, signIn, startDemo } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!initializing && session) {
      router.replace("/(tabs)");
    }
  }, [initializing, router, session]);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (caught) {
      setError(caught.message ?? "Sign-in could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  async function openDemo() {
    await startDemo();
    router.replace("/(tabs)");
  }

  if (initializing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.indigo} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <Screen>
        <View style={styles.hero}>
          <Brand light />
          <View style={styles.heroMark}>
            <ShieldCheck color={colors.white} size={48} strokeWidth={1.7} />
          </View>
          <Text style={styles.heroTitle}>Your credentials, connected to the source.</Text>
          <Text style={styles.heroCopy}>
            Keep issuer-backed records in one wallet and share only the details
            you approve.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formHeading}>
            <Text style={styles.eyebrow}>Credential holder access</Text>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.copy}>Sign in with your VerifiedDoc account.</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#96999E"
              style={styles.input}
              value={email}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#96999E"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            disabled={loading || !email.trim() || !password}
            icon={<LockKeyhole color={colors.white} size={18} />}
            onPress={submit}
          >
            {loading ? "Signing in..." : "Sign in securely"}
          </PrimaryButton>
          {process.env.EXPO_PUBLIC_DEMO_MODE !== "false" ? (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <PrimaryButton onPress={openDemo} secondary>
                Open fictional holder demo
              </PrimaryButton>
            </>
          ) : null}
          <Text style={styles.privacy}>
            Organization and platform administration are available in the web
            application.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loader: {
    alignItems: "center",
    backgroundColor: colors.surface,
    flex: 1,
    justifyContent: "center",
  },
  hero: {
    backgroundColor: colors.indigo,
    borderRadius: radius.lg,
    gap: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
  },
  heroMark: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 88,
    justifyContent: "center",
    marginBottom: -30,
    marginTop: -10,
    width: 88,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 27,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 34,
    maxWidth: 300,
  },
  heroCopy: {
    color: "#DCE5F2",
    fontSize: 14,
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow,
  },
  formHeading: {
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  heading: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
  },
  copy: {
    color: colors.gray,
    fontSize: 14,
  },
  field: {
    gap: 7,
  },
  label: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  error: {
    backgroundColor: colors.paleError,
    borderRadius: radius.sm,
    color: colors.error,
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
  },
  divider: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  dividerLine: {
    backgroundColor: colors.divider,
    flex: 1,
    height: 1,
  },
  privacy: {
    color: colors.gray,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
