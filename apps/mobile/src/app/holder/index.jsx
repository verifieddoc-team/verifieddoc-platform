import React from "react";
import { View, Text, ScrollView, StyleSheet, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";

import { COLORS, SPACING } from "../../constants/theme";
import HolderHeader from "./_HolderHeader";

export default function HomeScreen() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HolderHeader />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Welcome Back</Text>
        <Text style={styles.subtitle}>
          Here is your credential overview and recent activity.
        </Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your Wallet Summary</Text>
          <Text style={styles.summaryText}>
            Keep your verified credentials secure and share only what you need.
          </Text>
        </View>

        <Image
          source={require("../../../assets/images/verified doc 2.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  pageTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    lineHeight: 34,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  summaryCard: {
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: SPACING.sm,
    color: COLORS.text,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  heroImage: {
    width: "100%",
    height: 220,
    marginTop: SPACING.xl,
  },
});
