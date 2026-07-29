import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

const TOTAL_DOTS = 3;
const ACTIVE_DOT_INDEX = 2;

export default function OnboardingScreenThree() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const handleSkip = () => {
    router.replace("/auth/sign-in");
  };
  const handleGetStarted = () => {
    router.push("/auth/sign-up");
  };
  const handleSignIn = () => {
    router.push("/auth/sign-in");
  };

  if (!fontsLoaded) return null;
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.topRow}>
          <Pressable
            onPress={handleSkip}
            style={styles.skipButton}
            hitSlop={8}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationWrapper}>
          <Image
            source={require("../../../assets/images/onboarding-three.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Pagination dots */}
        <View style={styles.pagination}>
          {Array.from({ length: TOTAL_DOTS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === ACTIVE_DOT_INDEX && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Heading + description */}
        <View style={styles.textBlock}>
          <Text style={styles.heading}>Verify with Confidence</Text>
          <Text style={styles.description}>
            Organizations can verify credentials in seconds, reducing fraud
            and saving time.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={handleGetStarted}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
            onPress={handleSignIn}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  primary: "#1F3864",
  secondary: "#2C6E7F",
  accent: "#B08D57",
//   background: "#F7F8FA",
background: "#FFFFFF",
  text: "#1A1D23",
  textSecondary: "#6B6F76",
  border: "#E0E0E0",
  surface: "#FFFFFF",
  surfaceTint: "#F5F4F8",   
  dotInactive: "#E0E0E0",
};

const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: SPACING.xl,
    justifyContent: "flex-start",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: SPACING.xs,
  },
  skipButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    
    alignSelf: "flex-end",
  },
  skipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.surface,
  },
 illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 16,
},
 illustration: {
  width: "100%",
  height: 290,
},
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6, 
    backgroundColor: COLORS.dotInactive,
    marginHorizontal:8,
  },
 dotActive: {
  backgroundColor: COLORS.primary,
  width: 12,
  height: 12,
  borderRadius: 6,
},
  textBlock: {
    alignItems: "center",
    marginTop: 16,  
    marginBottom: 24,
  },
 heading: {
  fontFamily: "Poppins_600SemiBold",
  fontSize: 24,
  lineHeight: 30,
  textAlign: "center",
  color: COLORS.text,
  width: "100%",
  marginBottom: 10,
},
description: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 28,
    color: COLORS.textSecondary,
    textAlign: "center",
    width: "82%",
    alignSelf: "center",
},
 actions: {
    marginTop: 10,
    gap: 24,
},
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
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
  secondaryButton: {
  backgroundColor: "#F5F4F8",   
  borderWidth: 1.5,
  borderColor: COLORS.primary,
  borderRadius: 8,
  paddingVertical: 18,
  alignItems: "center",
  justifyContent: "center",
  elevation: 0,
  shadowOpacity: 0,
},
  secondaryButtonPressed: {
    backgroundColor: COLORS.background,
  },
  secondaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.primary,
  },
});