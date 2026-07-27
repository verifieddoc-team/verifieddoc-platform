import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Building2,
  CalendarDays,
  FileKey,
  LockKeyhole,
  Share2,
} from "lucide-react-native";
import { Screen } from "../../components/screen";
import {
  EmptyState,
  PrimaryButton,
  SectionHeading,
  StatusPill,
} from "../../components/ui";
import { useWallet } from "../../context/wallet-context";
import { formatDate, humanize } from "../../lib/format";
import { colors, radius, shadow, spacing } from "../../theme";

export default function CredentialDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { credentials } = useWallet();
  const credential = credentials.find((item) => item.id === id);

  if (!credential) {
    return (
      <Screen>
        <EmptyState
          copy="This record is not available in the current holder wallet."
          title="Credential not found"
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <SectionHeading
        action={<StatusPill status={credential.effectiveStatus} />}
        copy="Authenticated details supplied by the issuing organization."
        eyebrow="Issuer-backed record"
        title={credential.title}
      />

      <View style={styles.document}>
        <View style={styles.documentTop}>
          <View style={styles.mark}>
            <Text style={styles.markText}>VD</Text>
          </View>
          <View style={styles.publicId}>
            <Text style={styles.publicIdLabel}>Public ID</Text>
            <Text style={styles.publicIdValue}>{credential.publicId}</Text>
          </View>
        </View>
        <Text style={styles.type}>{humanize(credential.credentialType)}</Text>
        <Text style={styles.title}>{credential.title}</Text>
        <Text style={styles.description}>
          {credential.description ?? "No description was provided."}
        </Text>
        <View style={styles.issuer}>
          <Building2 color={colors.teal} size={22} />
          <View style={styles.issuerCopy}>
            <Text style={styles.metaLabel}>Issued by</Text>
            <Text style={styles.issuerName}>{credential.organization.name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.detailCard}>
        <DetailRow
          Icon={FileKey}
          label="Reference number"
          value={credential.referenceNo}
        />
        <DetailRow
          Icon={CalendarDays}
          label="Issue date"
          value={formatDate(credential.issuedAt)}
        />
        <DetailRow
          Icon={CalendarDays}
          label="Expiry date"
          value={formatDate(credential.expiresAt)}
        />
      </View>

      <View style={styles.claims}>
        <Text style={styles.cardEyebrow}>Structured claims</Text>
        {credential.claims && Object.keys(credential.claims).length > 0 ? (
          Object.entries(credential.claims).map(([key, value]) => (
            <View key={key} style={styles.claimRow}>
              <Text style={styles.claimKey}>{humanize(key)}</Text>
              <Text style={styles.claimValue}>{String(value)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>No structured claims were included.</Text>
        )}
      </View>

      {credential.effectiveStatus === "REVOKED" ? (
        <View style={styles.revoked}>
          <Text style={styles.revokedTitle}>This credential was revoked</Text>
          <Text style={styles.revokedCopy}>
            {credential.revocationReason ?? "No reason was provided."}
          </Text>
          <Text style={styles.revokedDate}>
            Recorded {formatDate(credential.revokedAt)}
          </Text>
        </View>
      ) : null}

      <View style={styles.integrity}>
        <LockKeyhole color={colors.teal} size={20} />
        <Text style={styles.integrityText}>
          VerifiedDoc shows the record and its current lifecycle state. It does
          not make employment or admission decisions.
        </Text>
      </View>

      {credential.effectiveStatus === "ACTIVE" ? (
        <PrimaryButton
          icon={<Share2 color={colors.white} size={18} />}
          onPress={() => router.push(`/share/${credential.id}`)}
        >
          Share this credential
        </PrimaryButton>
      ) : null}
    </Screen>
  );
}

function DetailRow({ Icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon color={colors.indigo} size={18} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  document: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadow,
  },
  documentTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  mark: {
    alignItems: "center",
    backgroundColor: colors.indigo,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  markText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "900",
  },
  publicId: {
    alignItems: "flex-end",
  },
  publicIdLabel: {
    color: colors.gray,
    fontSize: 10,
    textTransform: "uppercase",
  },
  publicIdValue: {
    color: colors.indigo,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  type: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "700",
    lineHeight: 30,
  },
  description: {
    color: colors.gray,
    fontSize: 13,
    lineHeight: 20,
  },
  issuer: {
    alignItems: "center",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  issuerCopy: {
    flex: 1,
  },
  metaLabel: {
    color: colors.gray,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  issuerName: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailRow: {
    alignItems: "center",
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 68,
    paddingHorizontal: spacing.md,
  },
  detailIcon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  detailCopy: {
    flex: 1,
    gap: 3,
  },
  detailValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "600",
  },
  claims: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  cardEyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  claimRow: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  claimKey: {
    color: colors.gray,
    fontSize: 13,
  },
  claimValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  muted: {
    color: colors.gray,
    fontSize: 13,
  },
  revoked: {
    backgroundColor: colors.paleError,
    borderRadius: radius.md,
    gap: 4,
    padding: spacing.md,
  },
  revokedTitle: {
    color: colors.error,
    fontSize: 14,
    fontWeight: "800",
  },
  revokedCopy: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
  },
  revokedDate: {
    color: colors.gray,
    fontSize: 11,
  },
  integrity: {
    alignItems: "flex-start",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  integrityText: {
    color: colors.gray,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
});
