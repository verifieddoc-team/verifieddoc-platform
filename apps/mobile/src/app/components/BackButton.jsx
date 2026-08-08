import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";


export default function BackButton({ onPress, color = "#1F3864", style }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.88,
      useNativeDriver: true,
      speed: 60,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 6,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.back();
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* Chevron drawn with two rotated views */}
        <View style={styles.chevronWrapper}>
          <View style={[styles.chevronBar, styles.chevronTop, { backgroundColor: color }]} />
          <View style={[styles.chevronBar, styles.chevronBottom, { backgroundColor: color }]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: {
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronBar: {
    position: "absolute",
    width: 9,
    height: 2,
    borderRadius: 1,
  },
  chevronTop: {
    transform: [{ rotate: "-45deg" }, { translateY: -3 }],
  },
  chevronBottom: {
    transform: [{ rotate: "45deg" }, { translateY: 3 }],
  },
});
