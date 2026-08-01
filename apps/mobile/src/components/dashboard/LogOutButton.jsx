import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

export default function LogOutButton({ onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <MaterialIcons name="logout" size={18} color={COLORS.error} />
      <Text style={styles.label}>Log Out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    borderRadius: 10,
    paddingVertical: 16,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  buttonPressed: {
    backgroundColor: "#FBEDEB",
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
});
