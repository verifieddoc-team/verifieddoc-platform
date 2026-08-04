import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";
import FormInput from "../components/FormInput";

const LOGO = require("../../../assets/images/verified doc 2.png");
const LOCK_KEY = require("../../../assets/images/image 8.png");

/* ── Password Strength Helper ── */
function getStrength(password) {
  if (!password) return { level: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: "Weak", color: "#E53935" };
  if (score === 2) return { level: 2, label: "Fair", color: "#F9A825" };
  if (score === 3) return { level: 3, label: "Good", color: "#43A047" };
  return { level: 4, label: "Strong", color: "#1B5E20" };
}

export default function CreateNewPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const strength = useMemo(() => getStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirm;
  const confirmError =
    submitted && confirm && !passwordsMatch ? "Passwords do not match" : "";

  const handleReset = () => {
    setSubmitted(true);
    if (password.length >= 8 && passwordsMatch) {
      router.push("/(auth)/reset-successful");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header: Back + Logo ── */}
        <View style={styles.headerRow}>
          <BackButton />
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Illustration ── */}
        <View style={styles.illustrationWrap}>
          <Image source={LOCK_KEY} style={styles.illustration} resizeMode="contain" />
        </View>

        {/* ── Heading ── */}
        <Text style={styles.heading}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Your new password must be strong{"\n"}and easy for you to remember.
        </Text>

        {/* ── New Password ── */}
        <FormInput
          label="New Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••••••"
          secureTextEntry
          returnKeyType="next"
        />

        {/* ── Strength Bar ── */}
        {password.length > 0 && (
          <View style={styles.strengthWrap}>
            <View style={styles.strengthBars}>
              {[1, 2, 3, 4].map((seg) => (
                <View
                  key={seg}
                  style={[
                    styles.strengthSeg,
                    {
                      backgroundColor:
                        seg <= strength.level
                          ? strength.color
                          : "#E0E6F0",
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>
              {strength.label}
            </Text>
          </View>
        )}

        {/* ── Confirm Password ── */}
        <FormInput
          label="Confirm Password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="••••••••••••"
          secureTextEntry
          error={confirmError}
          returnKeyType="done"
          onSubmitEditing={handleReset}
          style={styles.confirmInput}
        />

        {/* ── Passwords match indicator ── */}
        {passwordsMatch && (
          <View style={styles.matchRow}>
            <View style={styles.checkCircle}>
              <Text style={styles.checkMark}>✓</Text>
            </View>
            <Text style={styles.matchText}>Passwords match</Text>
          </View>
        )}

        {/* ── Reset Button ── */}
        <PrimaryButton
          label="Reset Password"
          onPress={handleReset}
          style={styles.resetBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  logo: {
    width: 130,
    height: 38,
  },
  headerSpacer: {
    width: 40,
  },

  // Illustration
  illustrationWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  illustration: {
    width: 120,
    height: 120,
  },

  // Heading
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7A9A",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },

  // Strength bar
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -8,
    marginBottom: 16,
  },
  strengthBars: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    height: 4,
  },
  strengthSeg: {
    flex: 1,
    borderRadius: 2,
    height: 4,
  },
  strengthLabel: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    minWidth: 44,
    textAlign: "right",
  },

  // Confirm
  confirmInput: {
    marginTop: 4,
  },

  // Match indicator
  matchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#43A047",
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  matchText: {
    fontSize: 13,
    color: "#43A047",
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
  },

  // Button
  resetBtn: {
    width: "100%",
    marginTop: 8,
  },
});
