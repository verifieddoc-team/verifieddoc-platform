import React, { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";


export default function PaginationDots({
  count = 3,
  activeIndex = 0,
  activeColor = "#1F3864",
  inactiveColor = "#C9D3E8",
  dotSize = 8,
  activeWidth = 24,
  gap = 6,
  style,
}) {
  // One animated width value per dot
  const widths = useRef(
    Array.from({ length: count }, (_, i) =>
      new Animated.Value(i === activeIndex ? activeWidth : dotSize)
    )
  ).current;

  const opacities = useRef(
    Array.from({ length: count }, (_, i) =>
      new Animated.Value(i === activeIndex ? 1 : 0.35)
    )
  ).current;

  useEffect(() => {
    const animations = widths.map((anim, i) =>
      Animated.spring(anim, {
        toValue: i === activeIndex ? activeWidth : dotSize,
        useNativeDriver: false,
        speed: 20,
        bounciness: 8,
      })
    );

    const opacityAnims = opacities.map((anim, i) =>
      Animated.timing(anim, {
        toValue: i === activeIndex ? 1 : 0.35,
        duration: 220,
        useNativeDriver: false,
      })
    );

    Animated.parallel([...animations, ...opacityAnims]).start();
  }, [activeIndex]);

  return (
    <View style={[styles.row, { gap }, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: widths[i],
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: i === activeIndex ? activeColor : inactiveColor,
              opacity: opacities[i],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    // width/height/borderRadius applied dynamically
  },
});
