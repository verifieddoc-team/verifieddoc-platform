import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
} from "react-native";


export default function PrimaryButton({
  label = "Continue",
  onPress,
  loading = false,
  disabled = false,
  variant = "solid",
  style,
  textStyle,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const isOutline = variant === "outline";

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={!disabled && !loading ? onPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={({ pressed }) => [
          styles.button,
          isOutline ? styles.buttonOutline : styles.buttonSolid,
          (disabled || loading) && styles.buttonDisabled,
          pressed && styles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator
            color={isOutline ? "#1F3864" : "#FFFFFF"}
            size="small"
          />
        ) : (
          <Text
            style={[
              styles.label,
              isOutline ? styles.labelOutline : styles.labelSolid,
              textStyle,
            ]}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  buttonSolid: {
    backgroundColor: "#1F3864",
  },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#1F3864",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  labelSolid: {
    color: "#FFFFFF",
  },
  labelOutline: {
    color: "#1F3864",
  },
});
