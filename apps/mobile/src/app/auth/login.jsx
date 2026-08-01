import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFonts, Poppins_600SemiBold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_500Medium } from "@expo-google-fonts/inter";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

const ROLES = [
  {
    key: "holder",
    title: "Credential Holder",
    description: "Manage and share your documents",
    IconComponent: MaterialIcons,
    iconName: "person",
  },
  {
    key: "verifier",
    title: "Verifier",
    description: "Verify certificate and manage verification requests",
    IconComponent: MaterialCommunityIcons,
    iconName: "office-building",
  },
  {
    key: "institution",
    title: "Issuing Institution",
    description: "Issue and verify certificate for your institution",
    IconComponent: MaterialCommunityIcons,
    iconName: "school",
  },
];

export default function LoginScreen() {
  const router = useRouter();

  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
  });

  const [selectedRole, setSelectedRole] = useState("holder");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  const handleCreateAccount = () => {
    router.push("/auth/sign-up");
  };

  const handleLogin = () => {
    // TODO: wire up real authentication logic (call the login API,
    // store the returned token/user in auth state, handle errors).
    console.log("Logging in as:", selectedRole, {
      email,
      password,
      rememberMe,
    });

    if (selectedRole === "verifier") {
      router.push("/verifier");
    } else {
      // Credential Holder and Issuing Institution both land on /dashboard
      // for now. Holder doesn't have its own home screen yet — this is a
      // placeholder until one exists.
      router.push("/dashboard");
    }
  };

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.illustrationWrapper}>
          <Image
            source={require("../../../assets/images/login.png")}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>
            <Text style={styles.goldText}>Secure, </Text>
            <Text>Fast, </Text>
            <Text>Reliable</Text>
          </Text>

          <Text style={styles.subtitle}>
            Employer Certificate Verification Made{" "}
            <Text style={styles.goldText}>Simple</Text>
          </Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.heading}>Log in</Text>
          <Text style={styles.description}>
            Access Your Account by Selecting your Role
          </Text>
        </View>

        {/* Role selection cards */}
        <View style={styles.rolesWrapper}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.key;
            const { IconComponent, iconName } = role;

            return (
              <Pressable
                key={role.key}
                onPress={() => setSelectedRole(role.key)}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
              >
                {/* Icon container */}
                <View
                  style={[
                    styles.roleIconCircle,
                    isSelected && styles.roleIconCircleSelected,
                  ]}
                >
                  <IconComponent
                    name={iconName}
                    size={26}
                    color={COLORS.secondary}
                  />
                </View>

                {/* Title + description */}
                <View style={styles.roleTextBlock}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDescription}>{role.description}</Text>
                </View>

                {/* Radio button */}
                <View style={styles.radioOuter}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Email field */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="mail"
              size={20}
              color={COLORS.secondary}
              style={styles.inputIcon}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter Your Email Address"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>
        </View>

        {/* Password field */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={styles.inputWrapper}>
            <MaterialIcons
              name="lock"
              size={20}
              color={COLORS.secondary}
              style={styles.inputIcon}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter Your Password"
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              style={[styles.input, { flex: 1 }]}
            />
            <Pressable
              onPress={() => setShowPassword((prev) => !prev)}
              hitSlop={8}
            >
              <MaterialIcons
                name={showPassword ? "visibility" : "visibility-off"}
                size={20}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>
        </View>

        {/* Remember me / Forgot password row */}
        <View style={styles.rememberRow}>
          <Pressable
            style={styles.rememberLeft}
            onPress={() => setRememberMe((prev) => !prev)}
            hitSlop={8}
          >
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
            >
              {rememberMe && (
                <MaterialIcons name="check" size={14} color={COLORS.surface} />
              )}
            </View>
            <Text style={styles.rememberText}>Remember Me</Text>
          </Pressable>

          <Pressable onPress={handleForgotPassword} hitSlop={8}>
            <Text style={styles.forgotText}>Forget Password?</Text>
          </Pressable>
        </View>

        {/* Login button */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={handleLogin}
        >
          <Text style={styles.primaryButtonText}>Log In</Text>
        </Pressable>

        {/* Bottom sign-up prompt */}
        <View style={styles.bottomTextRow}>
          <Text style={styles.bottomText}>Don&apos;t have an account? </Text>
          <Pressable onPress={handleCreateAccount} hitSlop={8}>
            <Text style={styles.bottomLink}>Create Account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = {
  primary: "#1F3864",
  secondary: "#2C6E7F",
  iconTeal: "#2F7186",
  accent: "#B08D57",
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
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: SPACING.xxl,
  },

  // Illustration
  illustrationWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  illustration: {
    width: "100%",
    height: 220,
  },

  taglineContainer: {
  alignItems: "center",
  marginTop: -8,
  marginBottom: 24,
},

tagline: {
  fontFamily: "Inter_500Medium",
  fontSize: 16,
  color: "#7A7A7A",
},

subtitle: {
  marginTop: 4,
  fontFamily: "Inter_400Regular",
  fontSize: 14,
  color: "#7A7A7A",
},

goldText: {
  color: "#B08D57",
  fontFamily: "Inter_500Medium",
},

  // Heading / subtitle
  textBlock: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  heading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 30,
    lineHeight: 38,
    textAlign: "center",
    color: COLORS.primary,
    marginBottom: 9,
    marginTop: -6,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Role cards
  rolesWrapper: {
    gap: 12,
    marginBottom: SPACING.lg,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  roleCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceTint,
  },
  roleIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  roleIconCircleSelected: {
    borderColor: COLORS.iconTeal,
  },
  roleTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  roleTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 2,
  },
  roleDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },

  // Form fields
  fieldBlock: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: COLORS.surface,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
    height: "100%",
  },

  // Remember me row
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  rememberLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  rememberText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.text,
  },
  forgotText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.accent,
  },

  // Login button (matches onboarding primaryButton)
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
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

  // Bottom sign-up prompt
  bottomTextRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottomLink: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: COLORS.accent,
  },
});
