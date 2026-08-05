import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";
import OtpInput from "../components/OtpInput";

const LOGO = require("../../../assets/images/verified doc 2.png");
const SHIELD_LOCK = require("../../../assets/images/image 9.png");

const OTP_COUNTDOWN = 45; // seconds

export default function OtpVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [seconds, setSeconds] = useState(OTP_COUNTDOWN);
  const [canResend, setCanResend] = useState(false);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (seconds <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const handleResend = useCallback(() => {
    if (!canResend) return;
    setOtp("");
    setSeconds(OTP_COUNTDOWN);
    setCanResend(false);
    // TODO: trigger resend API
  }, [canResend]);

  const handleContinue = () => {
    if (otp.length === 6) {
      router.push("/(auth)/create-new-password");
    }
  };

  const pad = (n) => String(n).padStart(2, "0");
  const timerLabel = `Resend code in 00:${pad(seconds)}`;

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

        {/* ── Shield Illustration ── */}
        <View style={styles.illustrationWrap}>
          <Image source={SHIELD_LOCK} style={styles.illustration} resizeMode="contain" />
        </View>

        {/* ── Heading ── */}
        <Text style={styles.heading}>Verify Your Identity</Text>

        {/* ── Subtitle ── */}
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{"\n"}
          <Text style={styles.emailHighlight}>youremail@gmail.com.</Text>
        </Text>

        {/* ── OTP Input ── */}
        <View style={styles.otpWrap}>
          <OtpInput value={otp} onChange={setOtp} />
        </View>

        {/* ── Countdown timer ── */}
        <View style={styles.timerRow}>
          {/* Clock icon (amber) */}
          <View style={styles.clockIcon}>
            <View style={styles.clockFace} />
            <View style={styles.clockHand} />
          </View>
          <Text style={[styles.timerText, canResend && styles.timerTextDim]}>
            {canResend ? "You can resend the code now" : timerLabel}
          </Text>
        </View>

        {/* ── Continue Button ── */}
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          disabled={otp.length < 6}
          style={styles.continueBtn}
        />

        {/* ── Resend Code ── */}
        <Pressable
          onPress={handleResend}
          style={styles.resendRow}
          disabled={!canResend}
          accessibilityRole="button"
        >
          <Text style={[styles.resendText, !canResend && styles.resendDim]}>
            Resend Code
          </Text>
        </Pressable>
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
    marginBottom: 28,
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
    marginBottom: 28,
  },
  illustration: {
    width: 130,
    height: 130,
  },

  // Heading
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 10,
  },

  // Subtitle
  subtitle: {
    fontSize: 13.5,
    color: "#6B7A9A",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    color: "#1F3864",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
  },

  // OTP
  otpWrap: {
    marginBottom: 24,
  },

  // Timer
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  clockIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: "#F9A825",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  clockFace: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  clockHand: {
    position: "absolute",
    width: 1.5,
    height: 5,
    backgroundColor: "#F9A825",
    bottom: "50%",
    left: "50%",
    marginLeft: -0.75,
    transformOrigin: "bottom",
    transform: [{ rotate: "-20deg" }],
  },
  timerText: {
    fontSize: 13,
    color: "#F9A825",
    fontFamily: "Poppins_500Medium",
    fontWeight: "500",
  },
  timerTextDim: {
    color: "#9AA5BC",
  },

  // Continue button
  continueBtn: {
    width: "100%",
    marginBottom: 18,
  },

  // Resend
  resendRow: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 13,
    color: "#1F3864",
    fontFamily: "Poppins_600SemiBold",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  resendDim: {
    color: "#B0BAC9",
    textDecorationLine: "none",
  },
});
