import React, { useState } from "react";
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

const LOGO = require("../../../assets/images/verified doc 2.png");
const SHIELD_LOCK = require("../../../assets/images/image 9.png");

export default function ForgetPassword() {
  const router = useRouter();
  const [method, setMethod] = useState("email"); 

  const handleSend = () => {
    router.push("/(auth)/otp-verification");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Logo ── */}
        <View style={styles.logoRow}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        </View>

        {/* ── Shield Illustration ── */}
        <View style={styles.illustrationWrap}>
          <Image source={SHIELD_LOCK} style={styles.illustration} resizeMode="contain" />
        </View>

        {/* ── Security Card ── */}
        <View style={styles.securityCard}>
          <View style={styles.securityIconDot} />
          <View style={styles.securityTextCol}>
            <Text style={styles.securityTitle}>Your Security is our priority</Text>
            <Text style={styles.securitySub}>
              The extra steps helps keep your account safe and secure
            </Text>
          </View>
        </View>

        {/* ── Main Heading ── */}
        <Text style={styles.heading}>How do you want to reset your{"\n"}password?</Text>

        {/* ── Subtext link ── */}
        <Text style={styles.foundText}>
          <Text style={styles.foundLink}>
            We found the following information{"\n"}associated with your account
          </Text>
        </Text>

        {/* ── Options ── */}
        <View style={styles.optionsWrap}>
          <RadioOption
            selected={method === "email"}
            onPress={() => setMethod("email")}
            label="Email a link  to  Aden***********om"
          />
          <RadioOption
            selected={method === "phone"}
            onPress={() => setMethod("phone")}
            label="send a code to a phone number that ends with 98"
          />
        </View>

        {/* ── Send Button ── */}
        <PrimaryButton
          label="Send"
          onPress={handleSend}
          style={styles.sendBtn}
        />

        {/* ── Can't access ── */}
        <Pressable style={styles.cantAccessRow} accessibilityRole="button">
          <Text style={styles.cantAccessText}>I cant access my account</Text>
        </Pressable>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <View style={styles.footerShield} />
          <Text style={styles.footerText}>Secure verification by Verified Doc</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────────── Radio Option ─────────────────── */
function RadioOption({ selected, onPress, label }) {
  return (
    <Pressable style={styles.radioRow} onPress={onPress} accessibilityRole="radio">
      <View style={styles.radioOuter}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </Pressable>
  );
}

/* ─────────────────── Styles ─────────────────── */
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

  // Logo
  logoRow: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 160,
    height: 44,
  },

  // Illustration
  illustrationWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  illustration: {
    width: 100,
    height: 100,
  },

  // Security card
  securityCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F4F7FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
    gap: 12,
  },
  securityIconDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1F3864",
    opacity: 0.12,
    marginTop: 2,
  },
  securityTextCol: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    marginBottom: 3,
  },
  securitySub: {
    fontSize: 11.5,
    color: "#6B7A9A",
    fontFamily: "Poppins_400Regular",
    lineHeight: 17,
  },

  // Heading
  heading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    marginBottom: 10,
    lineHeight: 30,
  },

  // Found text
  foundText: {
    marginBottom: 22,
  },
  foundLink: {
    fontSize: 13,
    color: "#1F3864",
    textDecorationLine: "underline",
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },

  // Radio options
  optionsWrap: {
    marginBottom: 30,
    gap: 14,
  },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#1F3864",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1F3864",
  },
  radioLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontFamily: "Poppins_400Regular",
    lineHeight: 20,
  },

  // Send button
  sendBtn: {
    width: "100%",
    marginBottom: 18,
  },

  // Can't access
  cantAccessRow: {
    alignItems: "center",
    marginBottom: 32,
  },
  cantAccessText: {
    fontSize: 13,
    color: "#374151",
    fontFamily: "Poppins_400Regular",
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerShield: {
    width: 20,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#D1D9E6",
  },
  footerText: {
    fontSize: 12,
    color: "#9AA5BC",
    fontFamily: "Poppins_400Regular",
  },
});