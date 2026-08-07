import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { mobileApi } from "../../services/api";
import { readSession } from "../../services/session";

export default function CredentialDetailsScreen() {
  const router = useRouter();
  const { credentialId } = useLocalSearchParams();

  const [credential, setCredential] = useState(null);
  const [shareLinks, setShareLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingLink, setCreatingLink] = useState(false);
  const [error, setError] = useState("");

  const loadCredential = useCallback(async () => {
    try {
      setError("");

      const session = await readSession();

      if (!session?.accessToken) {
        router.replace("/auth/login");
        return;
      }

      if (
        !credentialId ||
        typeof credentialId !== "string"
      ) {
        setError("Credential ID is missing.");
        return;
      }

      const [credentialResponse, shareLinkResponse] =
        await Promise.all([
          mobileApi.credential(
            session.accessToken,
            credentialId
          ),
          mobileApi.shareLinks(
            session.accessToken,
            credentialId
          ),
        ]);

      setCredential(
        credentialResponse?.credential ?? null
      );

      setShareLinks(
        Array.isArray(shareLinkResponse?.data)
          ? shareLinkResponse.data
          : []
      );
    } catch (loadError) {
      setError(
        loadError?.message ??
          "Unable to load this credential."
      );
    } finally {
      setLoading(false);
    }
  }, [credentialId, router]);

  useEffect(() => {
    void loadCredential();
  }, [loadCredential]);

  const formatDate = (value) => {
    if (!value) return "Not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString();
  };

  const handleCreateShareLink = async () => {
    try {
      if (
        !credentialId ||
        typeof credentialId !== "string"
      ) {
        return;
      }

      const session = await readSession();

      if (!session?.accessToken) {
        router.replace("/auth/login");
        return;
      }

      setCreatingLink(true);

      const result = await mobileApi.createShareLink(
        session.accessToken,
        credentialId,
        {
          expiresInHours: 24,
          disclosedClaims: [],
          includeHolderName: false,
          includeReferenceNo: false,
        }
      );

      if (!result?.verificationUrl) {
        throw new Error(
          "The verification link was not returned."
        );
      }

      await Share.share({
        title: "VerifiedDoc credential",
        message:
          `Verify this credential securely on VerifiedDoc:\n${result.verificationUrl}`,
        url: result.verificationUrl,
      });

      await loadCredential();
    } catch (shareError) {
      Alert.alert(
        "Unable to create link",
        shareError?.message ??
          "Please try again."
      );
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevoke = async (shareLinkId) => {
    try {
      if (
        !credentialId ||
        typeof credentialId !== "string"
      ) {
        return;
      }

      const session = await readSession();

      if (!session?.accessToken) {
        router.replace("/auth/login");
        return;
      }

      await mobileApi.revokeShareLink(
        session.accessToken,
        credentialId,
        shareLinkId
      );

      await loadCredential();
    } catch (revokeError) {
      Alert.alert(
        "Unable to revoke link",
        revokeError?.message ??
          "Please try again."
      );
    }
  };

  const confirmRevoke = (shareLinkId) => {
    Alert.alert(
      "Revoke verification link?",
      "Anyone using this link will no longer be able to verify the credential.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Revoke",
          style: "destructive",
          onPress: () =>
            void handleRevoke(shareLinkId),
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator
          size="large"
          color="#1F3864"
        />

        <Text style={styles.loadingText}>
          Loading credential...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !credential) {
    return (
      <SafeAreaView style={styles.centered}>
        <MaterialIcons
          name="error-outline"
          size={48}
          color="#A23C32"
        />

        <Text style={styles.errorTitle}>
          Credential unavailable
        </Text>

        <Text style={styles.errorText}>
          {error || "Credential not found."}
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            Go back
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const claims = Object.entries(
    credential.claims ?? {}
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Credential Details
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {credential.title}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons
                name="workspace-premium"
                size={28}
                color="#2C6E7F"
              />
            </View>

            <View style={styles.titleContent}>
              <Text style={styles.title}>
                {credential.title}
              </Text>

              <Text style={styles.issuer}>
                {credential.organization?.name ??
                  "Unknown issuer"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <DetailRow
            label="Status"
            value={credential.effectiveStatus}
          />

          <DetailRow
            label="Type"
            value={credential.credentialType}
          />

          <DetailRow
            label="Reference"
            value={credential.referenceNo}
          />

          <DetailRow
            label="Public ID"
            value={credential.publicId}
          />

          <DetailRow
            label="Issued"
            value={formatDate(
              credential.issuedAt
            )}
          />

          <DetailRow
            label="Expires"
            value={
              credential.expiresAt
                ? formatDate(
                    credential.expiresAt
                  )
                : "No expiry"
            }
          />

          {credential.description ? (
            <View style={styles.descriptionBox}>
              <Text style={styles.sectionLabel}>
                Description
              </Text>

              <Text style={styles.description}>
                {credential.description}
              </Text>
            </View>
          ) : null}
        </View>

        {claims.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Credential claims
            </Text>

            {claims.map(([key, value]) => (
              <DetailRow
                key={key}
                label={key}
                value={String(value)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Share for verification
          </Text>

          <Text style={styles.sectionDescription}>
            Create a secure verification link
            that expires after 24 hours.
          </Text>

          <Pressable
            style={[
              styles.shareButton,
              creatingLink &&
                styles.disabledButton,
            ]}
            disabled={creatingLink}
            onPress={handleCreateShareLink}
          >
            {creatingLink ? (
              <ActivityIndicator
                color="#FFFFFF"
              />
            ) : (
              <>
                <MaterialIcons
                  name="share"
                  size={20}
                  color="#FFFFFF"
                />

                <Text style={styles.shareButtonText}>
                  Create & Share Link
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Verification links
          </Text>

          {shareLinks.length === 0 ? (
            <Text style={styles.emptyText}>
              No verification links have been
              created for this credential.
            </Text>
          ) : (
            shareLinks.map((link) => (
              <View
                key={link.id}
                style={styles.linkCard}
              >
                <View style={styles.linkHeader}>
                  <Text style={styles.linkState}>
                    {link.state}
                  </Text>

                  <Text style={styles.linkViews}>
                    {link.viewCount}
                    {link.maxViews
                      ? ` / ${link.maxViews}`
                      : ""}{" "}
                    views
                  </Text>
                </View>

                <Text style={styles.linkDate}>
                  Expires:{" "}
                  {formatDate(link.expiresAt)}
                </Text>

                {link.state === "ACTIVE" ? (
                  <Pressable
                    style={styles.revokeButton}
                    onPress={() =>
                      confirmRevoke(link.id)
                    }
                  >
                    <Text
                      style={
                        styles.revokeButtonText
                      }
                    >
                      Revoke
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))
          )}
        </View>
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
    backgroundColor: "#F5F7FA",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B6F76",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1F3864",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerButton: {
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#DCE4F2",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E7EC",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 50,
    height: 50,
    marginRight: 12,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9F2F4",
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1D23",
  },
  issuer: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B6F76",
  },
  divider: {
    height: 1,
    marginVertical: 16,
    backgroundColor: "#ECEFF2",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    color: "#6B6F76",
  },
  detailValue: {
    flex: 1.5,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
    color: "#1A1D23",
  },
  descriptionBox: {
    marginTop: 8,
  },
  sectionLabel: {
    marginBottom: 6,
    fontSize: 13,
    color: "#6B6F76",
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: "#1A1D23",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F3864",
  },
  sectionDescription: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    color: "#6B6F76",
  },
  shareButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    backgroundColor: "#2C6E7F",
  },
  disabledButton: {
    opacity: 0.6,
  },
  shareButtonText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: "#6B6F76",
  },
  linkCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F7F9FB",
  },
  linkHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  linkState: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2C6E7F",
  },
  linkViews: {
    fontSize: 12,
    color: "#6B6F76",
  },
  linkDate: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B6F76",
  },
  revokeButton: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: "#F6DEDA",
  },
  revokeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A23C32",
  },
  errorTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#A23C32",
  },
  errorText: {
    marginTop: 8,
    textAlign: "center",
    color: "#6B6F76",
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1F3864",
  },
  backButtonText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
