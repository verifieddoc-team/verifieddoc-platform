import React from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

/**
 * @param hasNotifications boolean — controls the small dot on the bell.
 *                          Defaults to false rather than assuming there's
 *                          something to notify about.
 * @param onPressBell       () => void
 */
export default function VerifierHeader({ hasNotifications = false, onPressBell }) {
  return (
    <View style={styles.header}>
      <Image
        source={require("../../../assets/images/main-logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Pressable onPress={onPressBell} hitSlop={10} style={styles.bellButton}>
        <MaterialIcons name="notifications-none" size={24} color={COLORS.surface} />
        {hasNotifications ? <View style={styles.notificationDot} /> : null}
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
  bellButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
});
