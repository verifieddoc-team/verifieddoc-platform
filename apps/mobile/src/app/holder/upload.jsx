import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFonts,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import HolderHeader from "./_HolderHeader";

export default function UploadScreen() {
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
        <Text style={styles.pageTitle}>Upload Document</Text>

        <View style={styles.uploadCard}>
          <MaterialIcons
            name="cloud-upload"
            size={42}
            color={COLORS.secondary}
          />
          <Text style={styles.uploadTitle}>Add a new credential</Text>
          <Text style={styles.uploadSubtitle}>
            Upload your document to keep your credentials safe and shareable.
          </Text>
          <Pressable style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Choose File</Text>
          </Pressable>
        </View>

        <View style={styles.howItWorksCard}>
          <Text style={styles.sectionTitle}>How it works</Text>
          <View style={styles.stepItem}>
            <MaterialIcons
              name="description"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.stepText}>
              Upload your verified credential.
            </Text>
          </View>
          <View style={styles.stepItem}>
            <MaterialIcons name="lock" size={20} color={COLORS.primary} />
            <Text style={styles.stepText}>
              It is stored securely in your wallet.
            </Text>
          </View>
          <View style={styles.stepItem}>
            <MaterialIcons name="share" size={20} color={COLORS.primary} />
            <Text style={styles.stepText}>
              Share only the details you choose.
            </Text>
          </View>
        </View>
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
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  uploadCard: {
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  uploadTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    color: COLORS.text,
  },
  uploadSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  uploadButton: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  uploadButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.surface,
  },
  howItWorksCard: {
    backgroundColor: COLORS.surfaceTint,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  stepText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
