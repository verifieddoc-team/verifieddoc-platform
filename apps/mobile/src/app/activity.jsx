import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Activity, Eye, Link2 } from "lucide-react-native";
import { Screen } from "../components/screen";
import { EmptyState, SectionHeading, StatusPill } from "../components/ui";
import { useSession } from "../context/session-context";
import { useWallet } from "../context/wallet-context";
import { mobileApi } from "../services/api";
import { formatDate } from "../lib/format";
import { colors, radius, spacing } from "../theme";

export default function ActivityScreen() {
  const { session, isDemo } = useSession();
  const { credentials } = useWallet();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    if (isDemo) {
      const timer = setTimeout(() => {
        setLinks([
          {
            id: "demo-activity",
            credentialTitle: credentials[0]?.title ?? "Demo credential",
            state: "ACTIVE",
            createdAt: "2026-07-23T10:00:00.000Z",
            expiresAt: "2026-07-30T10:00:00.000Z",
            viewCount: 2,
            maxViews: 10,
            lastViewedAt: "2026-07-24T10:00:00.000Z",
          },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }

    let active = true;
    Promise.resolve()
      .then(() => {
        if (active) {
          setLoading(true);
          setError("");
        }
        return Promise.all(
          credentials.map(async (credential) => {
            const response = await mobileApi.shareLinks(
              session.accessToken,
              credential.id,
            );
            return response.data.map((link) => ({
              ...link,
              credentialTitle: credential.title,
            }));
          }),
        );
      })
      .then((groups) => {
        if (active) {
          setLinks(
            groups
              .flat()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
          );
        }
      })
      .catch((caught) => {
        if (active) {
          setError(caught.message ?? "Could not load share-link activity.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [credentials, isDemo, session]);

  return (
    <Screen>
      <SectionHeading
        copy="View counts and access state for links you created."
        eyebrow="Holder activity"
        title="Share-link history"
      />
      {loading ? <ActivityIndicator color={colors.indigo} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && links.length === 0 ? (
        <EmptyState
          copy="Create a share link from an active credential to begin."
          title="No sharing activity"
        />
      ) : (
        links.map((link) => (
          <View key={link.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.icon}>
                <Link2 color={colors.indigo} size={20} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>{link.credentialTitle}</Text>
                <Text style={styles.date}>
                  Created {formatDate(link.createdAt)}
                </Text>
              </View>
              <StatusPill status={link.state} />
            </View>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Eye color={colors.teal} size={18} />
                <Text style={styles.metricValue}>{link.viewCount}</Text>
                <Text style={styles.metricLabel}>
                  of {link.maxViews ?? "∞"} views
                </Text>
              </View>
              <View style={styles.metric}>
                <Activity color={colors.gold} size={18} />
                <Text style={styles.metricLabel}>
                  Last viewed {formatDate(link.lastViewedAt)}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    backgroundColor: colors.paleError,
    borderRadius: radius.sm,
    color: colors.error,
    fontSize: 12,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
  top: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.paleIndigo,
    borderRadius: 10,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  titleCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  date: {
    color: colors.gray,
    fontSize: 10,
  },
  metrics: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.lg,
    paddingTop: spacing.md,
  },
  metric: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  metricValue: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.gray,
    fontSize: 10,
  },
});
