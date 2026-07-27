import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import {
  Check,
  Copy,
  ExternalLink,
  LockKeyhole,
  Share2,
  X,
} from "lucide-react-native";
import { Screen } from "../../components/screen";
import {
  EmptyState,
  PrimaryButton,
  SectionHeading,
  StatusPill,
} from "../../components/ui";
import { useSession } from "../../context/session-context";
import { useWallet } from "../../context/wallet-context";
import { mobileApi } from "../../services/api";
import { colors, radius, shadow, spacing } from "../../theme";
import { formatDate, humanize } from "../../lib/format";

export default function ShareCredentialScreen() {
  const { id } = useLocalSearchParams();
  const { session, isDemo } = useSession();
  const { credentials } = useWallet();
  const credential = credentials.find((item) => item.id === id);
  const claimKeys = useMemo(
    () => Object.keys(credential?.claims ?? {}),
    [credential],
  );
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [maxViews, setMaxViews] = useState("10");
  const [includeHolderName, setIncludeHolderName] = useState(false);
  const [includeReferenceNo, setIncludeReferenceNo] = useState(false);
  const [claims, setClaims] = useState([]);
  const [links, setLinks] = useState([]);
  const [createdUrl, setCreatedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!credential || !session) return;
    if (isDemo) {
      const timer = setTimeout(() => {
        setLinks([
          {
            id: "demo-share-active",
            createdAt: "2026-07-23T10:00:00.000Z",
            expiresAt: "2026-07-30T10:00:00.000Z",
            revokedAt: null,
            maxViews: 10,
            viewCount: 2,
            lastViewedAt: "2026-07-24T10:00:00.000Z",
            disclosedClaims: ["grade", "cohort"],
            includeHolderName: false,
            includeReferenceNo: false,
            state: "ACTIVE",
          },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }

    mobileApi
      .shareLinks(session.accessToken, credential.id)
      .then((response) => setLinks(response.data))
      .catch((caught) =>
        setError(caught.message ?? "Could not load existing share links."),
      );
  }, [credential, isDemo, session]);

  if (!credential || credential.effectiveStatus !== "ACTIVE") {
    return (
      <Screen>
        <EmptyState
          copy="Only an active credential in your wallet can create a new verification link."
          title="Credential cannot be shared"
        />
      </Screen>
    );
  }

  function toggleClaim(key) {
    setClaims((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    );
  }

  async function createLink() {
    if (!session) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const input = {
        expiresInHours: Number(expiresInHours),
        maxViews: maxViews ? Number(maxViews) : undefined,
        disclosedClaims: claims,
        includeHolderName,
        includeReferenceNo,
      };

      const result = isDemo
        ? {
            verificationUrl:
              "https://verifieddoc.example.test/verify/DEMO-VERIFIED-2026",
            shareLink: {
              id: `demo-share-${Date.now()}`,
              createdAt: new Date().toISOString(),
              expiresAt: new Date(
                Date.now() + input.expiresInHours * 60 * 60 * 1000,
              ).toISOString(),
              revokedAt: null,
              maxViews: input.maxViews ?? null,
              viewCount: 0,
              lastViewedAt: null,
              disclosedClaims: claims,
              includeHolderName,
              includeReferenceNo,
              state: "ACTIVE",
            },
          }
        : await mobileApi.createShareLink(
            session.accessToken,
            credential.id,
            input,
          );

      setCreatedUrl(result.verificationUrl);
      setLinks((current) => [result.shareLink, ...current]);
      setMessage("Secure verification link created. Copy or share it now.");
    } catch (caught) {
      setError(caught.message ?? "The share link could not be created.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    await Clipboard.setStringAsync(createdUrl);
    setMessage("Verification URL copied to your clipboard.");
  }

  async function shareLink() {
    await Share.share({
      message: `Verify my ${credential.title}: ${createdUrl}`,
      url: createdUrl,
    });
  }

  async function revoke(linkId) {
    if (!session) return;
    try {
      if (!isDemo) {
        await mobileApi.revokeShareLink(
          session.accessToken,
          credential.id,
          linkId,
        );
      }
      setLinks((current) =>
        current.map((link) =>
          link.id === linkId
            ? {
                ...link,
                revokedAt: new Date().toISOString(),
                state: "REVOKED",
              }
            : link,
        ),
      );
      setMessage("Share link revoked.");
    } catch (caught) {
      setError(caught.message ?? "The share link could not be revoked.");
    }
  }

  return (
    <Screen>
      <SectionHeading
        copy={credential.title}
        eyebrow="Holder-controlled disclosure"
        title="Create a secure link"
      />
      <View style={styles.privacy}>
        <LockKeyhole color={colors.teal} size={22} />
        <Text style={styles.privacyText}>
          All optional identity and claim fields are off until you select them.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Access limits</Text>
        <Text style={styles.label}>Link duration in hours</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setExpiresInHours}
          style={styles.input}
          value={expiresInHours}
        />
        <Text style={styles.label}>Maximum views</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setMaxViews}
          placeholder="Leave empty for unlimited"
          placeholderTextColor="#96999E"
          style={styles.input}
          value={maxViews}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identity disclosure</Text>
        <SwitchRow
          label="Include holder name"
          onValueChange={setIncludeHolderName}
          value={includeHolderName}
        />
        <SwitchRow
          label="Include reference number"
          onValueChange={setIncludeReferenceNo}
          value={includeReferenceNo}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Claims to disclose</Text>
        {claimKeys.length === 0 ? (
          <Text style={styles.muted}>This credential has no optional claims.</Text>
        ) : (
          claimKeys.map((key) => {
            const selected = claims.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggleClaim(key)}
                style={styles.claim}
              >
                <View style={[styles.checkbox, selected && styles.checkboxOn]}>
                  {selected ? <Check color={colors.white} size={15} /> : null}
                </View>
                <Text style={styles.claimText}>{humanize(key)}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      {error ? (
        <View style={styles.error}>
          <X color={colors.error} size={18} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={styles.success}>
          <Check color={colors.success} size={18} />
          <Text style={styles.successText}>{message}</Text>
        </View>
      ) : null}
      <PrimaryButton
        disabled={loading || Number(expiresInHours) < 1}
        icon={
          loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Share2 color={colors.white} size={18} />
          )
        }
        onPress={createLink}
      >
        {loading ? "Creating link..." : "Create verification link"}
      </PrimaryButton>

      {createdUrl ? (
        <View style={styles.qrCard}>
          <Text style={styles.cardTitle}>Share now</Text>
          <View style={styles.qr}>
            <QRCode
              backgroundColor={colors.white}
              color={colors.indigo}
              size={190}
              value={createdUrl}
            />
          </View>
          <Text numberOfLines={2} style={styles.url}>
            {createdUrl}
          </Text>
          <View style={styles.actions}>
            <PrimaryButton
              icon={<Copy color={colors.indigo} size={18} />}
              onPress={copyLink}
              secondary
            >
              Copy
            </PrimaryButton>
            <PrimaryButton
              icon={<ExternalLink color={colors.white} size={18} />}
              onPress={shareLink}
            >
              Share
            </PrimaryButton>
          </View>
          <Text style={styles.oneTime}>
            The raw token and full URL are returned only when the link is
            created.
          </Text>
        </View>
      ) : null}

      <SectionHeading eyebrow="Access history" title="Existing links" />
      {links.length === 0 ? (
        <EmptyState
          copy="New share links will appear here with their current access state."
          title="No links created"
        />
      ) : (
        links.map((link) => (
          <View key={link.id} style={styles.linkCard}>
            <View style={styles.linkTop}>
              <StatusPill status={link.state} />
              <Text style={styles.linkDate}>{formatDate(link.createdAt)}</Text>
            </View>
            <Text style={styles.linkCopy}>
              {link.viewCount} of {link.maxViews ?? "unlimited"} views used.
              Expires {formatDate(link.expiresAt)}.
            </Text>
            {link.state === "ACTIVE" ? (
              <Pressable onPress={() => revoke(link.id)} style={styles.revoke}>
                <Text style={styles.revokeText}>Revoke link</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </Screen>
  );
}

function SwitchRow({ label, value, onValueChange }) {
  return (
    <View style={styles.switchRow}>
      <Text style={styles.switchLabel}>{label}</Text>
      <Switch
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: "#C8C9CC", true: colors.teal }}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  privacy: {
    alignItems: "center",
    backgroundColor: "#EAF5F7",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
  },
  privacyText: {
    color: colors.gray,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  label: {
    color: colors.gray,
    fontSize: 12,
    fontWeight: "600",
    marginTop: spacing.xs,
  },
  input: {
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  switchRow: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
  },
  switchLabel: {
    color: colors.ink,
    fontSize: 14,
  },
  claim: {
    alignItems: "center",
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 50,
  },
  checkbox: {
    alignItems: "center",
    borderColor: colors.divider,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  checkboxOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  claimText: {
    color: colors.ink,
    fontSize: 14,
  },
  muted: {
    color: colors.gray,
    fontSize: 13,
  },
  error: {
    alignItems: "flex-start",
    backgroundColor: colors.paleError,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorText: {
    color: colors.error,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  success: {
    alignItems: "flex-start",
    backgroundColor: colors.paleSuccess,
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  successText: {
    color: colors.success,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow,
  },
  qr: {
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  url: {
    color: colors.indigo,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  oneTime: {
    color: colors.gray,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
  },
  linkCard: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  linkTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkDate: {
    color: colors.gray,
    fontSize: 11,
  },
  linkCopy: {
    color: colors.gray,
    fontSize: 12,
    lineHeight: 18,
  },
  revoke: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  revokeText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: "800",
  },
});
