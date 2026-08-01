// Placeholder route — dedicated verify/scan flow to be implemented separately.
// The Home tab already includes a basic "Verify a Credential" form; this
// screen can become a richer scan-focused flow (camera/QR) later.
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../constants/theme";

export default function VerifyScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centered}>
        <Text style={styles.text}>Verify</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl },
  text: { fontFamily: "Inter_500Medium", fontSize: 15, color: COLORS.textSecondary },
});
