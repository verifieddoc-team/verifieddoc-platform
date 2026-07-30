// src/app/auth/sign-up.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts, Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

import { COLORS, SPACING } from "../../constants/theme";
import StepIndicator from "../../components/signup/StepIndicator";
import AccountTypeCard from "../../components/signup/AccountTypeCard";
import FormInput from "../../components/signup/FormInput";
import PhoneInputField from "../../components/signup/PhoneInputField";
import IndustryDropdown from "../../components/signup/IndustryDropdown";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 80, 320);

const ROLES = [
  {
    key: "holder",
    title: "Credential Holder",
    IconComponent: MaterialIcons,
    iconName: "person",
    bullets: [
      "Upload and manage certificates",
      "Share verified credentials securely",
      "Track verification history",
    ],
  },
  {
    key: "verifier",
    title: "Verifier",
    IconComponent: MaterialCommunityIcons,
    iconName: "office-building",
    bullets: [
      "Verify applicants' certificates",
      "Manage verification requests",
      "Download verification reports",
    ],
  },
  {
    key: "institution",
    title: "Issuing Institution",
    IconComponent: MaterialCommunityIcons,
    iconName: "school",
    bullets: [
      "Issue digital certificates",
      "Verify certificate authenticity",
      "Manage issued credentials",
    ],
  },
];

// Fields common to both organization-type accounts (verifier + institution)
const ORG_FIELD_KEYS = ["companyName", "workEmail", "industry", "phone", "hrContact", "password", "confirmPassword"];
const HOLDER_FIELD_KEYS = ["fullName", "workEmail", "phone", "password", "confirmPassword"];

export default function SignUpScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  // --- Step + carousel state ---
  const [step, setStep] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);

  // --- Form state ---
  const [form, setForm] = useState({
    fullName: "",
    companyName: "",
    workEmail: "",
    industry: "",
    phone: "",
    hrContact: "",
    password: "",
    confirmPassword: "",
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [errors, setErrors] = useState({});

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const goToPrevCard = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goToNextCard = () => setActiveIndex((i) => Math.min(ROLES.length - 1, i + 1));

  const handleContinue = (roleKey) => {
    setSelectedRoleKey(roleKey);
    setStep(2);
  };

  const selectedRole = ROLES.find((r) => r.key === selectedRoleKey);
  const isHolder = selectedRoleKey === "holder";
  const activeFieldKeys = isHolder ? HOLDER_FIELD_KEYS : ORG_FIELD_KEYS;

  const validate = () => {
    const newErrors = {};
    activeFieldKeys.forEach((key) => {
      if (!form[key] || !form[key].trim()) {
        newErrors[key] = "This field is required";
      }
    });
    if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the Terms of Service";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateAccount = () => {
    if (!validate()) return;
    // No backend yet — this is where the sign-up API call will go.
    console.log("Sign up payload:", { accountType: selectedRoleKey, ...form });
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={step} />

        <View style={styles.textBlock}>
          <Text style={styles.heading}>Create Your Account</Text>
          <Text style={styles.description}>
            Choose the account that best describes you to get Started
          </Text>
        </View>

        {/* Step 1: account type carousel */}
        <View style={styles.carouselRow}>
          <Pressable onPress={goToPrevCard} hitSlop={12} disabled={activeIndex === 0}>
            <MaterialIcons
              name="chevron-left"
              size={28}
              color={activeIndex === 0 ? COLORS.dotInactive : COLORS.textSecondary}
            />
          </Pressable>

          <AccountTypeCard
            role={ROLES[activeIndex]}
            isSelected={selectedRoleKey === ROLES[activeIndex].key}
            cardWidth={CARD_WIDTH}
            onContinue={() => handleContinue(ROLES[activeIndex].key)}
          />

          <Pressable onPress={goToNextCard} hitSlop={12} disabled={activeIndex === ROLES.length - 1}>
            <MaterialIcons
              name="chevron-right"
              size={28}
              color={activeIndex === ROLES.length - 1 ? COLORS.dotInactive : COLORS.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.dotsRow}>
          {ROLES.map((role, index) => (
            <View
              key={role.key}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Step 2: dynamic form, only once a role has been chosen */}
        {selectedRole && (
          <>
            <View style={styles.selectedBlock}>
              <MaterialIcons name="arrow-downward" size={20} color={COLORS.text} />
              <Text style={styles.selectedText}>Selected {selectedRole.title}</Text>
            </View>

            <Text style={styles.formHeading}>
              {isHolder ? "Create Personal Account" : "Create Organisation Account"}
            </Text>

            {isHolder ? (
              <FormInput
                label="Full Name"
                iconName="person"
                placeholder="Enter Your Full Name"
                value={form.fullName}
                onChangeText={(v) => updateField("fullName", v)}
                error={errors.fullName}
              />
            ) : (
              <FormInput
                label="Company Name"
                iconName="business"
                placeholder="Enter Your Company Name"
                value={form.companyName}
                onChangeText={(v) => updateField("companyName", v)}
                error={errors.companyName}
              />
            )}

            <FormInput
              label="Work Email"
              iconName="mail"
              placeholder="Enter Your Work Email"
              value={form.workEmail}
              onChangeText={(v) => updateField("workEmail", v)}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.workEmail}
            />

            {!isHolder && (
              <IndustryDropdown
                value={form.industry}
                onSelect={(v) => updateField("industry", v)}
                error={errors.industry}
              />
            )}

            <PhoneInputField
              value={form.phone}
              onChangeText={(v) => updateField("phone", v)}
              error={errors.phone}
            />

            {!isHolder && (
              <FormInput
                label="HR Contact Name"
                iconName="account-circle"
                placeholder="Enter Full name"
                value={form.hrContact}
                onChangeText={(v) => updateField("hrContact", v)}
                error={errors.hrContact}
              />
            )}

            <FormInput
              label="Password"
              iconName="lock"
              placeholder="Create a Strong Password"
              value={form.password}
              onChangeText={(v) => updateField("password", v)}
              secureTextEntry
              error={errors.password}
            />

            <FormInput
              label="Confirm Password"
              iconName="lock"
              placeholder="Re-enter Your Password"
              value={form.confirmPassword}
              onChangeText={(v) => updateField("confirmPassword", v)}
              secureTextEntry
              error={errors.confirmPassword}
            />

            {/* Terms checkbox */}
            <Pressable
              style={styles.termsRow}
              onPress={() => {
                setAgreedToTerms((prev) => !prev);
                setErrors((prev) => ({ ...prev, terms: null }));
              }}
              hitSlop={8}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && (
                  <MaterialIcons name="check" size={14} color={COLORS.surface} />
                )}
              </View>
              <Text style={styles.termsText}>
                I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                <Text style={styles.termsLink}>Privacy Policy</Text>
              </Text>
            </Pressable>
            {errors.terms ? <Text style={styles.errorText}>{errors.terms}</Text> : null}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
              ]}
              onPress={handleCreateAccount}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>
          </>
        )}

        <View style={styles.bottomTextRow}>
          <Text style={styles.bottomText}>Already have an account? </Text>
          <Pressable onPress={() => router.push("/auth/login")} hitSlop={8}>
            <Text style={styles.bottomLink}>Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: SPACING.xxl },

  textBlock: { alignItems: "center", marginBottom: SPACING.lg },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 26,
    lineHeight: 34,
    textAlign: "center",
    color: COLORS.primary,
    marginBottom: 8,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  carouselRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dotsRow: { flexDirection: "row", justifyContent: "center", marginBottom: SPACING.lg },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.dotInactive,
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: COLORS.primary },

  selectedBlock: { alignItems: "center", marginBottom: 20 },
  selectedText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 4,
  },
  formHeading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  termsText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  },
  termsLink: { fontFamily: "Inter_500Medium", color: COLORS.accent },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.error,
    marginBottom: SPACING.md,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.surface,
  },

  bottomTextRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  bottomText: { fontFamily: "Inter_400Regular", fontSize: 14, color: COLORS.textSecondary },
  bottomLink: { fontFamily: "Inter_500Medium", fontSize: 14, color: COLORS.accent },
});