import { Pressable, StyleSheet, Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { colors, radius, shadow, spacing } from "../theme";
import { formatDate, humanize } from "../lib/format";

export function Brand({ light = false, compact = false }) {
  return (
    <View style={styles.brand}>
      <View style={[styles.brandMark, light && styles.brandMarkLight]}>
        <ShieldCheck
          color={light ? colors.indigo : colors.white}
          size={compact ? 18 : 24}
          strokeWidth={2.4}
        />
      </View>
      <Text
        style={[
          styles.brandText,
          compact && styles.brandTextCompact,
          light && styles.brandTextLight,
        ]}
      >
        VerifiedDoc
      </Text>
    </View>
  );
}

export function PrimaryButton({
  children,
  onPress,
  disabled = false,
  secondary = false,
  icon,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonSecondaryText,
        ]}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function StatusPill({ status }) {
  const palette =
    status === "ACTIVE" || status === "VALID" || status === "VERIFIED"
      ? [colors.paleSuccess, colors.success]
      : status === "EXPIRED" || status === "PENDING"
        ? [colors.paleWarning, "#8A6300"]
        : [colors.paleError, colors.error];
  return (
    <View style={[styles.status, { backgroundColor: palette[0] }]}>
      <View style={[styles.statusDot, { backgroundColor: palette[1] }]} />
      <Text style={[styles.statusText, { color: palette[1] }]}>{status}</Text>
    </View>
  );
}

export function SectionHeading({ eyebrow, title, copy, action }) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionHeadingCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.heading}>{title}</Text>
        {copy ? <Text style={styles.body}>{copy}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function CredentialCard({ credential, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.cardTop}>
        <View style={styles.credentialMark}>
          <Text style={styles.credentialMarkText}>VD</Text>
        </View>
        <StatusPill status={credential.effectiveStatus} />
      </View>
      <Text style={styles.cardType}>{humanize(credential.credentialType)}</Text>
      <Text style={styles.cardTitle}>{credential.title}</Text>
      <Text style={styles.cardIssuer}>{credential.organization.name}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          Issued {formatDate(credential.issuedAt)}
        </Text>
        <Text style={styles.cardLink}>View record</Text>
      </View>
    </Pressable>
  );
}

export function EmptyState({ title, copy }) {
  return (
    <View style={styles.empty}>
      <ShieldCheck color={colors.teal} size={30} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  brandMark: {
    alignItems: "center",
    backgroundColor: colors.indigo,
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  brandMarkLight: {
    backgroundColor: colors.white,
  },
  brandText: {
    color: colors.indigo,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  brandTextCompact: {
    fontSize: 19,
  },
  brandTextLight: {
    color: colors.white,
  },
  button: {
    alignItems: "center",
    backgroundColor: colors.indigo,
    borderColor: colors.indigo,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  buttonSecondaryText: {
    color: colors.indigo,
  },
  status: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusDot: {
    borderRadius: 99,
    height: 6,
    width: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sectionHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  sectionHeadingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  heading: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.5,
    lineHeight: 31,
  },
  body: {
    color: colors.gray,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    ...shadow,
  },
  cardPressed: {
    opacity: 0.82,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  credentialMark: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  credentialMarkText: {
    color: colors.indigo,
    fontSize: 13,
    fontWeight: "900",
  },
  cardType: {
    color: colors.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 23,
  },
  cardIssuer: {
    color: colors.gray,
    fontSize: 13,
  },
  cardFooter: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  cardDate: {
    color: colors.gray,
    fontSize: 11,
  },
  cardLink: {
    color: colors.indigo,
    fontSize: 12,
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyCopy: {
    color: colors.gray,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
});
