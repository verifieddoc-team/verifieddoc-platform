import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LockKeyhole, Share2 } from "lucide-react-native";
import { Screen } from "../../components/screen";
import {
  CredentialCard,
  EmptyState,
  SectionHeading,
} from "../../components/ui";
import { useWallet } from "../../context/wallet-context";
import { colors, radius, spacing } from "../../theme";

export default function ShareScreen() {
  const router = useRouter();
  const { credentials } = useWallet();
  const shareable = credentials.filter(
    (credential) => credential.effectiveStatus === "ACTIVE",
  );

  return (
    <Screen>
      <SectionHeading
        copy="Choose an active credential, then control exactly what the verifier can see."
        eyebrow="Minimum disclosure"
        title="Consent-based sharing"
      />
      <View style={styles.privacy}>
        <LockKeyhole color={colors.teal} size={22} />
        <View style={styles.privacyCopy}>
          <Text style={styles.privacyTitle}>Private by default</Text>
          <Text style={styles.privacyText}>
            Your name, reference number, and claims stay hidden unless you
            select them.
          </Text>
        </View>
      </View>
      {shareable.length === 0 ? (
        <EmptyState
          copy="Only active credentials can be shared through a new verification link."
          title="No shareable credential"
        />
      ) : (
        shareable.map((credential) => (
          <CredentialCard
            credential={credential}
            key={credential.id}
            onPress={() => router.push(`/share/${credential.id}`)}
          />
        ))
      )}
      <View style={styles.note}>
        <Share2 color={colors.gold} size={20} />
        <Text style={styles.noteText}>
          Each link can expire, stop after a set number of views, or be revoked
          from your account.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  privacy: {
    alignItems: "flex-start",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  privacyCopy: {
    flex: 1,
  },
  privacyTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  privacyText: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  note: {
    alignItems: "flex-start",
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  noteText: {
    color: colors.gray,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
