import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import LoadingIndicator from "./components/LoadingIndicator";

const { height } = Dimensions.get("window");

export default function Index() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const spinnerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(spinnerOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.delay(300),
    ]).start(() => {
      router.replace("/onboarding/screen-one");
    });
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={require("../../assets/images/logo-white.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }}
      >
        <Text style={styles.title}>
          Trusted Digital{"\n"}Credential Verification
        </Text>
      </Animated.View>

      <Animated.View
        style={[styles.spinnerWrapper, { opacity: spinnerOpacity }]}
      >
        <LoadingIndicator size={52} color="#2ECC71" thickness={4} />
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        Secure. Fast. Reliable
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F3864",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(46,204,113,0.06)",
  },
  logoWrapper: {
    marginBottom: 36,
  },
  logo: {
    width: 240,
    height: 80,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: 0.3,
    marginBottom: 48,
  },
  spinnerWrapper: {
    marginBottom: 40,
  },
  tagline: {
    position: "absolute",
    bottom: height * 0.08,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
