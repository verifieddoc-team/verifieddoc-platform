// src/app/auth/verify-email.jsx (continued)
import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import SecurityBanner from "../../components/auth/SecurityBanner";
import MaskedEmail from "../../components/auth/MaskedEmail";
import OTPInput from "../../components/auth/OTPInput";
import CountdownTimer from "../../components/auth/CountdownTimer";

const OTP_LENGTH = 6;
const TIMER_DURATION_SECONDS = 3 * 60 + 25; // 03:25

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); // passed from sign-up: router.push({ pathname: "/auth/verify-email", params: { email } })

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState(null);
  const [isTimerExpired, setIsTimerExpired] = useState(false);
  const [timerResetKey, setTimerResetKey] = useState(0); // bumping this restarts CountdownTimer

  const handleTimerExpire = useCallback(() => {
    setIsTimerExpired(true);
  }, []);

  const handleResendCode = () => {
    if (!isTimerExpired) return;

    // TODO: call resend-OTP API endpoint here once backend is ready
    console.log("Resending code to:", email);

    setOtp("");
    setOtpError(null);
    setIsTimerExpired(false);
    setTimerResetKey((prev) => prev + 1); // restarts the countdown
  };

  const handleVerify = () => {
    if (otp.length < OTP_LENGTH) {
      setOtpError("Please enter all 6 digits");
      return;
    }

    setOtpError(null);

    // TODO: send `otp` + `email` to the verification API endpoint here.
    // On success, navigate forward; on failure, setOtpError with the server message.
    console.log("Verifying code:", otp, "for", email);

    router.push("/dashboard"); // placeholder destination until dashboard exists
  };

  if (!fontsLoaded) return null;

  const isVerifyDisabled = isTimerExpired;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SecurityBanner />

        <View style={styles.textBlock}>
          <Text style={styles.heading}>Verify Your Code</Text>
          <Text style={styles.description}>Enter the 6 digit code sent to</Text>
          <MaskedEmail email={email} style={styles.emailText} />
        </View>

        <OTPInput value={otp} onChange={setOtp} hasError={!!otpError} />
        {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

     <CountdownTimer
  key={timerResetKey}
  durationSeconds={TIMER_DURATION_SECONDS}
  onExpire={handleTimerExpire}
/>

        <View style={styles.resendRow}>
<Text style={styles.resendPrompt}>Didn&apos;t receive the code? </Text>
          <Pressable onPress={handleResendCode} disabled={!isTimerExpired} hitSlop={8}>
            <Text
              style={[
                styles.resendLink,
                !isTimerExpired && styles.resendLinkDisabled,
              ]}
            >
              Resend code
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            isVerifyDisabled && styles.primaryButtonDisabled,
            pressed && !isVerifyDisabled && styles.primaryButtonPressed,
          ]}
          onPress={handleVerify}
          disabled={isVerifyDisabled}
        >
          <Text style={styles.primaryButtonText}>Verify Code</Text>
        </Pressable>

        <View style={styles.footer}>
          <MaterialIcons name="shield" size={18} color={COLORS.dotInactive} />
          <Text style={styles.footerText}>Secure verification by Verified Doc</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: SPACING.xxl },

  textBlock: { alignItems: "center", marginBottom: SPACING.xl },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 28,
    lineHeight: 36,
    textAlign: "center",
    color: COLORS.primary,
    marginBottom: 10,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 4,
  },
  emailText: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.accent,
    textAlign: "center",
  },

  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: 12,
  },

  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    flexWrap: "wrap",
  },
  resendPrompt: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  resendLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.accent,
  },
  resendLinkDisabled: {
    opacity: 0.4,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xl,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.surface,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.dotInactive,
    marginLeft: 6,
  },
});