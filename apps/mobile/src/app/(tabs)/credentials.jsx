import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Search } from "lucide-react-native";
import { Screen } from "../../components/screen";
import {
  CredentialCard,
  EmptyState,
  SectionHeading,
} from "../../components/ui";
import { useWallet } from "../../context/wallet-context";
import { colors, radius, spacing } from "../../theme";

export default function CredentialsScreen() {
  const router = useRouter();
  const { credentials, loading } = useWallet();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return credentials;
    return credentials.filter((credential) =>
      [
        credential.title,
        credential.referenceNo,
        credential.organization.name,
        credential.effectiveStatus,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [credentials, query]);

  return (
    <Screen>
      <SectionHeading
        copy="Current status comes directly from each issuer-backed record."
        eyebrow="Holder wallet"
        title="Your credentials"
      />
      <View style={styles.search}>
        <Search color={colors.gray} size={19} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search title, issuer, or reference"
          placeholderTextColor="#96999E"
          style={styles.input}
          value={query}
        />
      </View>
      {loading ? <ActivityIndicator color={colors.indigo} /> : null}
      {!loading && filtered.length === 0 ? (
        <EmptyState
          copy="Try another search, or wait for an issuing organization to add a record."
          title="No matching credentials"
        />
      ) : (
        filtered.map((credential) => (
          <CredentialCard
            credential={credential}
            key={credential.id}
            onPress={() => router.push(`/credential/${credential.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.divider,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.ink,
    flex: 1,
    fontSize: 14,
  },
});
