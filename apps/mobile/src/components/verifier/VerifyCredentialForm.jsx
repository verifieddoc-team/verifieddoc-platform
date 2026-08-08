import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param onVerify (credentialId: string) => void
 * @param verifying boolean — disables the button while a check is in flight
 */
export default function VerifyCredentialForm({ onVerify, verifying = false }) {
  const [credentialId, setCredentialId] = useState("");

  const handlePress = () => {
    const trimmed = credentialId.trim();
    if (!trimmed) return;
    onVerify?.(trimmed);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.heading}>Verify a Credential</Text>

      <TextInput
        value={credentialId}
        onChangeText={setCredentialId}
        placeholder="Enter credential ID or scan QR....."
        placeholderTextColor={COLORS.textSecondary}
        style={styles.input}
        autoCapitalize="none"
      />

      <Pressable
        onPress={handlePress}
        disabled={verifying}
        style={({ pressed }) => [
          styles.button,
          verifying && styles.buttonDisabled,
          pressed && !verifying && styles.buttonPressed,
        ]}
      >
        <Text style={styles.buttonText}>{verifying ? "Verifying…" : "Verify"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 52,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
    marginBottom: SPACING.md,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: COLORS.surface,
  },
});
