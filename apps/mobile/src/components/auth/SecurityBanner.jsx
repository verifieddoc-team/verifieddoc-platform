import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

export default function SecurityBanner({
  title = "Your Security is our Priority",
  subtitle = "The extra steps help keep your account safe and secure",
}) {
  return (
    <View style={styles.row}>
      <View style={styles.iconWrapper}>
        <MaterialIcons name="shield" size={40} color={COLORS.primary} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.xl,
  },
  iconWrapper: {
    marginRight: 14,
    marginTop: 2,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    lineHeight: 24,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
});