import React from "react";
import { View, Image, StyleSheet } from "react-native";

export default function OnboardingIllustration({ source }) {
  return (
    <View style={styles.illustrationWrapper}>
      <Image source={source} style={styles.illustration} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
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
});