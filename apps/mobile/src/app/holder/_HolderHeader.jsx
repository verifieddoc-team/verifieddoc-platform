import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

export default function HolderHeader() {
  return (
    <View style={styles.header}>
      <Image
        source={require("../../../assets/images/main-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Pressable style={styles.bell} hitSlop={8}>
        <MaterialIcons
          name="notifications-none"
          size={24}
          color={COLORS.surface}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  logo: {
    width: 150,
    height: 36,
  },
  bell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
});
