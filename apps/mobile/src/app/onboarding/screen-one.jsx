import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import OnboardingSkip from "../components/onboarding/OnboardingSkip";
import OnboardingIllustration from "../components/onboarding/OnboardingIllustration";
import OnboardingPagination from "../components/onboarding/OnboardingPagination";
import OnboardingButton from "../components/onboarding/OnboardingButton";

export default function OnboardingScreenOne() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const handleSkip = () => {
    router.replace("/auth/login");
  };

  const handleNext = () => {
    router.push("/onboarding/screen-two");
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <OnboardingSkip onPress={handleSkip} />

        <OnboardingIllustration
          source={require("../../../assets/images/image 4.png")}
        />

        <OnboardingPagination total={3} activeIndex={0} />

        <View style={styles.textBlock}>
          <Text style={styles.heading}>
            Your Credentials,{"\n"}Always Verified
          </Text>
          <Text style={styles.description}>
            Store all your verified digital certificates in one secure
            digital wallet.
          </Text>
        </View>

        <View style={styles.actions}>
          <OnboardingButton label="Next" onPress={handleNext} variant="primary" />
        </View>
      </View>
    </SafeAreaView>
  );
}

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
});