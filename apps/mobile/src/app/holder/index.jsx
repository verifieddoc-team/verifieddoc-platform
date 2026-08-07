import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { mobileApi } from "../../services/api";
import { clearSession, readSession } from "../../services/session";

export default function HolderWalletScreen() {
  const router = useRouter();

  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadWallet = useCallback(async () => {
    try {
      setError("");

      const session = await readSession();

      if (!session?.accessToken) {
        router.replace("/auth/login");
        return;
      }

      const response = await mobileApi.wallet(session.accessToken);

      setCredentials(
        Array.isArray(response?.data) ? response.data : []
      );
    } catch (loadError) {
      setError(
        loadError?.message ??
          "Unable to load your credentials."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadWallet();
  };

  const handleLogout = async () => {
    const session = await readSession();

    try {
      if (session?.refreshToken) {
        await mobileApi.logout(session.refreshToken);
      }
    } catch (logoutError) {
      console.warn("Server logout failed:", logoutError);
    } finally {
      await clearSession();
      router.replace("/auth/login");
    }
  };

  const formatDate = (value) => {
    if (!value) return "No expiry";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }

    return date.toLocaleDateString();
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "ACTIVE":
        return styles.statusActive;
      case "EXPIRED":
        return styles.statusExpired;
      case "REVOKED":
        return styles.statusRevoked;
      default:
        return styles.statusUnknown;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#1F3864" />
        <Text style={styles.loadingText}>
          Loading your credentials...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Credentials</Text>
          <Text style={styles.headerSubtitle}>
            Your VerifiedDoc wallet
          </Text>
        </View>

        <Pressable
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Couldn&apos;t load credentials
          </Text>

          <Text style={styles.errorText}>{error}</Text>

          <Pressable
            onPress={loadWallet}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={credentials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            credentials.length === 0 &&
              styles.emptyListContent,
          ]}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons
                name="verified-user"
                size={48}
                color="#2C6E7F"
              />

              <Text style={styles.emptyTitle}>
                No credentials yet
              </Text>

              <Text style={styles.emptyText}>
                Credentials issued to your account will appear
                here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
           <Pressable
  style={({ pressed }) => [
    styles.card,
    pressed && { opacity: 0.8 },
  ]}
  onPress={() =>
    router.push(`/holder/${item.id}`)
  }
>
              <View style={styles.cardTop}>
                <View style={styles.iconCircle}>
                  <MaterialIcons
                    name="workspace-premium"
                    size={24}
                    color="#2C6E7F"
                  />
                </View>

                <View style={styles.cardHeading}>
                  <Text style={styles.credentialTitle}>
                    {item.title}
                  </Text>

                  <Text style={styles.issuer}>
                    {item.organization?.name ??
                      "Unknown issuer"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.row}>
                <Text style={styles.label}>Type</Text>
                <Text style={styles.value}>
                  {item.credentialType}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Issued</Text>
                <Text style={styles.value}>
                  {formatDate(item.issuedAt)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Expires</Text>
                <Text style={styles.value}>
                  {formatDate(item.expiresAt)}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Public ID</Text>
                <Text
                  style={styles.publicId}
                  numberOfLines={1}
                >
                  {item.publicId}
                </Text>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.label}>Status</Text>

                <View
                  style={[
                    styles.statusBadge,
                    getStatusStyle(item.effectiveStatus),
                  ]}
                >
                  <Text style={styles.statusText}>
                    {item.effectiveStatus}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
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
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B6F76",
  },
  header: {
    backgroundColor: "#1F3864",
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#DCE4F2",
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#2C6E7F",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E7EC",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#E9F2F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardHeading: {
    flex: 1,
  },
  credentialTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1D23",
  },
  issuer: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B6F76",
  },
  divider: {
    height: 1,
    backgroundColor: "#ECEFF2",
    marginVertical: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    color: "#6B6F76",
  },
  value: {
    maxWidth: "60%",
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1D23",
    textAlign: "right",
  },
  publicId: {
    maxWidth: "60%",
    fontSize: 12,
    color: "#2C6E7F",
    textAlign: "right",
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statusActive: {
    backgroundColor: "#DDF3E4",
  },
  statusExpired: {
    backgroundColor: "#F4EAD8",
  },
  statusRevoked: {
    backgroundColor: "#F6DEDA",
  },
  statusUnknown: {
    backgroundColor: "#E6E8EB",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1D23",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F3864",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: "#6B6F76",
  },
  errorBox: {
    margin: 20,
    backgroundColor: "#FFF2F0",
    padding: 18,
    borderRadius: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#A23C32",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B3A35",
  },
  retryButton: {
    marginTop: 14,
    alignSelf: "flex-start",
    backgroundColor: "#1F3864",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
