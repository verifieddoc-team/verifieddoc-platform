import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS, SPACING } from "../../constants/theme";
import { mobileApi } from "../../services/api";
import { readSession } from "../../services/session";

export default function IssueCredentialScreen() {
  const router = useRouter();

  const [organization, setOrganization] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const [holderEmail, setHolderEmail] = useState("");
  const [title, setTitle] = useState("");
  const [credentialType, setCredentialType] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [description, setDescription] = useState("");

  const [issuedAt, setIssuedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [expiresAt, setExpiresAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrganisation = async () => {
      try {
        setError("");

        const session = await readSession();

        if (!session?.accessToken) {
          router.replace("/auth/login");
          return;
        }

        setAccessToken(session.accessToken);

        const response = await mobileApi.organizations(
          session.accessToken
        );

        const memberships = Array.isArray(
          response?.organizations
        )
          ? response.organizations
          : [];

        if (memberships.length === 0) {
          setError(
            "Your account is not linked to an organisation."
          );
          return;
        }

        const selectedMembership = memberships[0];

        if (!selectedMembership?.organization?.id) {
          setError(
            "The organisation record is missing its ID."
          );
          return;
        }

        setOrganization({
          ...selectedMembership.organization,
          membershipRole:
            selectedMembership.membershipRole,
        });
      } catch (loadError) {
        setError(
          loadError?.message ??
            "Unable to load your organisation."
        );
      } finally {
        setLoading(false);
      }
    };

    void loadOrganisation();
  }, [router]);

  const parseDate = (value, fieldName) => {
    const cleanValue = value.trim();

    if (!cleanValue) {
      return null;
    }

    const pattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!pattern.test(cleanValue)) {
      throw new Error(
        `${fieldName} must use YYYY-MM-DD format.`
      );
    }

    const date = new Date(
      `${cleanValue}T00:00:00.000Z`
    );

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `${fieldName} is not a valid date.`
      );
    }

    return date;
  };

  const validateForm = () => {
    const cleanEmail = holderEmail
      .trim()
      .toLowerCase();

    if (!cleanEmail) {
      throw new Error(
        "Enter the credential holder's email address."
      );
    }

    if (!cleanEmail.includes("@")) {
      throw new Error(
        "Enter a valid credential holder email address."
      );
    }

    if (!title.trim()) {
      throw new Error(
        "Enter the credential title."
      );
    }

    if (!credentialType.trim()) {
      throw new Error(
        "Enter the credential type."
      );
    }

    if (referenceNo.trim().length < 3) {
      throw new Error(
        "Reference number must contain at least 3 characters."
      );
    }

    const issueDate = parseDate(
      issuedAt,
      "Issue date"
    );

    if (!issueDate) {
      throw new Error(
        "Enter the issue date."
      );
    }

    const expiryDate = expiresAt.trim()
      ? parseDate(expiresAt, "Expiry date")
      : null;

    if (
      expiryDate &&
      expiryDate.getTime() <= issueDate.getTime()
    ) {
      throw new Error(
        "Expiry date must be later than the issue date."
      );
    }

    return {
      cleanEmail,
      issueDate,
      expiryDate,
    };
  };

  const handleIssueCredential = async () => {
    try {
      setError("");

      if (!accessToken) {
        router.replace("/auth/login");
        return;
      }

      if (!organization?.id) {
        throw new Error(
          "No organisation is available for credential issuance."
        );
      }

      if (
        organization.membershipRole !==
          "ORGANIZATION_ADMIN" &&
        organization.membershipRole !==
          "ORGANIZATION_ISSUER"
      ) {
        throw new Error(
          "Your organisation role does not allow credential issuance."
        );
      }

      const {
        cleanEmail,
        issueDate,
        expiryDate,
      } = validateForm();

      setSubmitting(true);

      const input = {
        holderEmail: cleanEmail,
        title: title.trim(),
        credentialType: credentialType.trim(),
        referenceNo: referenceNo.trim(),
        issuedAt: issueDate.toISOString(),
      };

      if (description.trim()) {
        input.description = description.trim();
      }

      if (expiryDate) {
        input.expiresAt = expiryDate.toISOString();
      }

      const result =
        await mobileApi.issueOrganizationCredential(
          accessToken,
          organization.id,
          input
        );

      if (!result?.credential) {
        throw new Error(
          "The credential was issued but no credential record was returned."
        );
      }

      Alert.alert(
        "Credential issued",
        `${result.credential.title} was issued successfully.`,
        [
          {
            text: "Done",
            onPress: () =>
              router.replace("/organisation"),
          },
        ]
      );
    } catch (submitError) {
      setError(
        submitError?.message ??
          "Unable to issue the credential."
      );
    } finally {
      setSubmitting(false);
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
          Loading organisation...
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
          style={styles.backButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Issue Credential
          </Text>

          <Text
            style={styles.headerSubtitle}
            numberOfLines={1}
          >
            {organization?.name ??
              "Organisation"}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.infoCard}>
            <MaterialIcons
              name="verified"
              size={22}
              color={COLORS.secondary}
            />

            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>
                Issuing as
              </Text>

              <Text style={styles.infoText}>
                {organization?.name}
              </Text>

              <Text style={styles.roleText}>
                {organization?.membershipRole}
              </Text>
            </View>
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

          <FormField
            label="Holder email"
            required
            value={holderEmail}
            onChangeText={setHolderEmail}
            placeholder="holder@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <FormField
            label="Credential title"
            required
            value={title}
            onChangeText={setTitle}
            placeholder="Bachelor of Science"
          />

          <FormField
            label="Credential type"
            required
            value={credentialType}
            onChangeText={setCredentialType}
            placeholder="Degree, Certificate, Diploma..."
          />

          <FormField
            label="Reference number"
            required
            value={referenceNo}
            onChangeText={setReferenceNo}
            placeholder="VD-2026-0001"
            autoCapitalize="characters"
          />

          <FormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional credential description"
            multiline
          />

          <FormField
            label="Issue date"
            required
            value={issuedAt}
            onChangeText={setIssuedAt}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />

          <Text style={styles.helpText}>
            Date format: YYYY-MM-DD
          </Text>

          <FormField
            label="Expiry date"
            value={expiresAt}
            onChangeText={setExpiresAt}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />

          <Text style={styles.helpText}>
            Leave blank if the credential does not
            expire.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              (pressed || submitting) &&
                styles.submitButtonPressed,
            ]}
            disabled={submitting || !organization}
            onPress={handleIssueCredential}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <MaterialIcons
                  name="workspace-premium"
                  size={21}
                  color="#FFFFFF"
                />

                <Text style={styles.submitButtonText}>
                  Issue Credential
                </Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormField({
  label,
  required = false,
  multiline = false,
  ...inputProps
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? (
          <Text style={styles.required}>
            {" *"}
          </Text>
        ) : null}
      </Text>

      <TextInput
        {...inputProps}
        style={[
          styles.input,
          multiline && styles.multilineInput,
        ]}
        multiline={multiline}
        textAlignVertical={
          multiline ? "top" : "center"
        }
        placeholderTextColor="#9A9EA5"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
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
  scroll: {
    flex: 1,
    backgroundColor: COLORS.surfaceTint,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  infoCard: {
    flexDirection: "row",
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "#CFE1E5",
    borderRadius: 12,
    backgroundColor: "#EAF3F4",
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  infoText: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  roleText: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.secondary,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 10,
    backgroundColor: "#FFF1EF",
  },
  errorText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.error,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    marginBottom: SPACING.sm,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  required: {
    color: COLORS.error,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    fontSize: 15,
    color: COLORS.text,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  helpText: {
    marginTop: -SPACING.sm,
    marginBottom: SPACING.md,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  submitButtonPressed: {
    opacity: 0.75,
  },
  submitButtonText: {
    marginLeft: SPACING.sm,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
