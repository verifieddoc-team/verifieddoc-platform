import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import PrimaryButton from "../components/PrimaryButton";
import BackButton from "../components/BackButton";

const LOGO = require("../../../assets/images/verified doc 2.png");
const SUCCESS_SHIELD = require("../../../assets/imaages/image 10.png");

export default function ResetSuccessful() {
  const router = useRouter();

  /* ── Entry animations ── */
  const shieldScale = useRef(new Animated.Value(0.5)).current;
  const shieldOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Shield pops in
      Animated.parallel([
        Animated.spring(shieldScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(shieldOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Text slides up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Button fades in
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToSignIn = () => {
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* ── Header: Back + Logo ── */}
        <View style={styles.headerRow}>
          <BackButton />
          <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Animated Shield ── */}
        <Animated.View
          style={[
            styles.illustrationWrap,
            {
              opacity: shieldOpacity,
              transform: [{ scale: shieldScale }],
            },
          ]}
        >
          <Image
            source={SUCCESS_SHIELD}
            style={styles.illustration}
            resizeMode="contain"
          />
        </Animated.View>

        {/* ── Heading + Subtitle ── */}
        <Animated.View
          style={{
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          }}
        >
          <Text style={styles.heading}>Password Updated{"\n"}Successfully</Text>
          <Text style={styles.subtitle}>
            Your password has been updated{"\n"}successfully. You can now sign in{"\n"}securely.
          </Text>
        </Animated.View>

        {/* ── Go to Sign In Button ── */}
        <Animated.View style={[styles.btnWrap, { opacity: btnOpacity }]}>
          <PrimaryButton
            label="Go to Sign In"
            onPress={handleGoToSignIn}
            style={styles.signInBtn}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
  },

  // Header
  headerRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
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
    marginBottom: 36,
  },
  illustration: {
    width: 180,
    height: 180,
  },

  // Text
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7A9A",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 44,
  },

  // Button
  btnWrap: {
    width: "100%",
    marginTop: "auto",
  },
  signInBtn: {
    width: "100%",
  },
});
