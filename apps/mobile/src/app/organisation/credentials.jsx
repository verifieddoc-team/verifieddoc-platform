import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  COLORS,
  SPACING,
} from "../../constants/theme";
import { mobileApi } from "../../services/api";
import { readSession } from "../../services/session";

export default function OrganisationCredentialsScreen() {
  const router = useRouter();

  const [organization, setOrganization] =
    useState(null);

  const [credentials, setCredentials] =
    useState([]);

  const [accessToken, setAccessToken] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedCredential, setSelectedCredential] =
    useState(null);

  const [revocationReason, setRevocationReason] =
    useState("");

  const [revoking, setRevoking] =
    useState(false);

  const loadCredentials = useCallback(
    async ({ refresh = false } = {}) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        }

        const session = await readSession();

        if (!session?.accessToken) {
          router.replace("/auth/login");
          return;
        }

        setAccessToken(session.accessToken);

        const organizationResponse =
          await mobileApi.organizations(
            session.accessToken
          );

        const memberships = Array.isArray(
          organizationResponse?.organizations
        )
          ? organizationResponse.organizations
          : [];

        if (memberships.length === 0) {
          setOrganization(null);
          setCredentials([]);

          setError(
            "Your account is not linked to an organisation."
          );

          return;
        }

        const membership = memberships[0];

        const organizationId =
          membership?.organization?.id;

        if (!organizationId) {
          throw new Error(
            "The organisation record is missing its ID."
          );
        }

        setOrganization({
          ...membership.organization,
          membershipRole:
            membership.membershipRole,
        });

        const credentialResponse =
          await mobileApi.organizationCredentials(
            session.accessToken,
            organizationId
          );

        setCredentials(
          Array.isArray(credentialResponse?.data)
            ? credentialResponse.data
            : []
        );
      } catch (loadError) {
        setError(
          loadError?.message ??
            "Unable to load issued credentials."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    void loadCredentials();
  }, [loadCredentials]);

  const formatDate = (value) => {
    if (!value) {
      return "No expiry";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString();
  };

  const holderName = (holder) => {
    if (!holder) {
      return "Unknown holder";
    }

    const name = [
      holder.firstName,
      holder.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || holder.email;
  };

  const openRevokeModal = (credential) => {
    setSelectedCredential(credential);
    setRevocationReason("");
  };

  const closeRevokeModal = () => {
    if (revoking) {
      return;
    }

    setSelectedCredential(null);
    setRevocationReason("");
  };

  const handleRevoke = async () => {
    try {
      setError("");

      if (!selectedCredential) {
        return;
      }

      if (!organization?.id) {
        throw new Error(
          "Organisation information is unavailable."
        );
      }

      if (!accessToken) {
        router.replace("/auth/login");
        return;
      }

      const reason =
        revocationReason.trim();

      if (reason.length < 5) {
        throw new Error(
          "Revocation reason must contain at least 5 characters."
        );
      }

      setRevoking(true);

      await mobileApi.revokeOrganizationCredential(
        accessToken,
        organization.id,
        selectedCredential.id,
        reason
      );

      setSelectedCredential(null);
      setRevocationReason("");

      await loadCredentials({
        refresh: true,
      });
    } catch (revokeError) {
      setError(
        revokeError?.message ??
          "Unable to revoke this credential."
      );
    } finally {
      setRevoking(false);
    }
  };

  const statusStyle = (status) => {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;

      case "REVOKED":
        return styles.statusRevoked;

      case "EXPIRED":
        return styles.statusExpired;

      default:
        return styles.statusDefault;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
        />

        <Text style={styles.loadingText}>
          Loading issued credentials...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={["top"]}
    >
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
            Issued Credentials
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {organization?.name ??
              "Organisation"}
          </Text>
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() =>
            router.push("/organisation/issue")
          }
        >
          <MaterialIcons
            name="add"
            size={27}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <MaterialIcons
            name="error-outline"
            size={20}
            color={COLORS.error}
          />

          <Text style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={credentials}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          credentials.length === 0 &&
            styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() =>
              loadCredentials({
                refresh: true,
              })
            }
          />
        }
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <View>
              <Text style={styles.summaryLabel}>
                Total issued
              </Text>

              <Text style={styles.summaryValue}>
                {credentials.length}
              </Text>
            </View>

            <MaterialIcons
              name="workspace-premium"
              size={34}
              color={COLORS.secondary}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialIcons
              name="description"
              size={52}
              color={COLORS.secondary}
            />

            <Text style={styles.emptyTitle}>
              No credentials issued yet
            </Text>

            <Text style={styles.emptyText}>
              Credentials issued by this
              organisation will appear here.
            </Text>

            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                router.push(
                  "/organisation/issue"
                )
              }
            >
              <MaterialIcons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Issue Credential
              </Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>
                  {item.title}
                </Text>

                <Text style={styles.cardType}>
                  {item.credentialType}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  statusStyle(
                    item.effectiveStatus
                  ),
                ]}
              >
                <Text style={styles.statusText}>
                  {item.effectiveStatus}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <DetailRow
              label="Holder"
              value={holderName(item.holder)}
            />

            <DetailRow
              label="Email"
              value={item.holder?.email}
            />

            <DetailRow
              label="Reference"
              value={item.referenceNo}
            />

            <DetailRow
              label="Public ID"
              value={item.publicId}
            />

            <DetailRow
              label="Issued"
              value={formatDate(
                item.issuedAt
              )}
            />

            <DetailRow
              label="Expires"
              value={
                item.expiresAt
                  ? formatDate(
                      item.expiresAt
                    )
                  : "No expiry"
              }
            />

            {item.effectiveStatus ===
            "REVOKED" ? (
              <>
                <DetailRow
                  label="Revoked"
                  value={formatDate(
                    item.revokedAt
                  )}
                />

                {item.revocationReason ? (
                  <View
                    style={
                      styles.reasonBox
                    }
                  >
                    <Text
                      style={
                        styles.reasonLabel
                      }
                    >
                      Revocation reason
                    </Text>

                    <Text
                      style={
                        styles.reasonText
                      }
                    >
                      {
                        item.revocationReason
                      }
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}

            {item.effectiveStatus ===
            "ACTIVE" ? (
              <Pressable
                style={({ pressed }) => [
                  styles.revokeButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={() =>
                  openRevokeModal(item)
                }
              >
                <MaterialIcons
                  name="block"
                  size={18}
                  color={COLORS.error}
                />

                <Text
                  style={
                    styles.revokeButtonText
                  }
                >
                  Revoke Credential
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />

      <Modal
        visible={Boolean(
          selectedCredential
        )}
        transparent
        animationType="fade"
        onRequestClose={
          closeRevokeModal
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <MaterialIcons
              name="warning"
              size={42}
              color={COLORS.error}
            />

            <Text style={styles.modalTitle}>
              Revoke Credential
            </Text>

            <Text style={styles.modalText}>
              Revoking this credential is a
              permanent action.
            </Text>

            <Text
              style={
                styles.modalCredential
              }
            >
              {selectedCredential?.title}
            </Text>

            <TextInput
              value={revocationReason}
              onChangeText={
                setRevocationReason
              }
              style={styles.reasonInput}
              placeholder="Enter reason for revocation"
              placeholderTextColor="#9A9EA5"
              multiline
              textAlignVertical="top"
              editable={!revoking}
            />

            <Text style={styles.helpText}>
              Minimum 5 characters.
            </Text>

            <View
              style={
                styles.modalActions
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                disabled={revoking}
                onPress={
                  closeRevokeModal
                }
              >
                <Text
                  style={
                    styles.cancelButtonText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.confirmButton,
                  revoking &&
                    styles.buttonDisabled,
                ]}
                disabled={revoking}
                onPress={
                  handleRevoke
                }
              >
                {revoking ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.confirmButtonText
                    }
                  >
                    Revoke
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>
        {label}
      </Text>

      <Text
        style={styles.detailValue}
        numberOfLines={2}
      >
        {value ?? "Not available"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    marginHorizontal: SPACING.sm,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#DCE4F2",
  },
  errorBox: {
    flexDirection: "row",
    padding: SPACING.md,
    backgroundColor: "#FFF1EF",
  },
  errorText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.error,
  },
  list: {
    flex: 1,
    backgroundColor: COLORS.surfaceTint,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 12,
    backgroundColor: "#EAF3F4",
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 27,
    fontWeight: "700",
    color: COLORS.primary,
  },
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  cardTitleWrap: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
  },
  cardType: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusActive: {
    backgroundColor: "#DDF3E4",
  },
  statusRevoked: {
    backgroundColor: "#F6DEDA",
  },
  statusExpired: {
    backgroundColor: "#F3E7D3",
  },
  statusDefault: {
    backgroundColor: "#E7E9EC",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
    backgroundColor: COLORS.border,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailValue: {
    flex: 1.6,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    color: COLORS.text,
  },
  reasonBox: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 8,
    backgroundColor: "#FFF1EF",
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.error,
  },
  reasonText: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.text,
  },
  revokeButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    borderRadius: 9,
  },
  revokeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.error,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
  },
  emptyText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: COLORS.textSecondary,
  },
  primaryButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.lg,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    padding: SPACING.lg,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  modalTitle: {
    marginTop: SPACING.sm,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text,
  },
  modalText: {
    marginTop: SPACING.sm,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  modalCredential: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  reasonInput: {
    minHeight: 100,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  helpText: {
    marginTop: SPACING.xs,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelButton: {
    minWidth: 90,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
  },
  cancelButtonText: {
    fontWeight: "700",
    color: COLORS.text,
  },
  confirmButton: {
    minWidth: 100,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: COLORS.error,
  },
  confirmButtonText: {
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
