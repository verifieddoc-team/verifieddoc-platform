import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";


export default function LoadingIndicator({
  size = 56,
  color = "#2ECC71",
  thickness = 4,
}) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderTopColor: color,
            borderRightColor: color,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    // colours applied inline
  },
});
