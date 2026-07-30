import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import PrimaryButton from "../components/PrimaryButton";
import PaginationDots from "../components/PaginationDots";

const { width: SCREEN_W } = Dimensions.get("window");

/* ─────────────────── Slide Data ─────────────────── */
const SLIDES = [
  {
    id: "1",
    image: require("../../../assets/images/image 4.png"),
    title: "Your Credentials,\nAlways Verified",
    subtitle:
      "Store all your verified digital certificates in one secure digital wallet.",
  },

  {
    id: "2",
    image: require("../../../assets/images/image 5.png"),
    title: "Share Securely",
    subtitle:
      "Share your credentials instantly with employers and organizations while keeping full control.",
  },
  
  {
    id: "3",
    image: require("../../../assets/images/image 6.png"),
    title: "Instant Verification",
    subtitle:
      "Employers verify your credentials in seconds — no paperwork, no delays.",
  },
];

/* ─────────────────── Onboarding Screen ─────────────────── */
export default function OnboardingScreen() {
  const router = useRouter();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollX = useRef(new Animated.Value(0)).current;

  const isLast = activeIndex === SLIDES.length - 1;

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (isLast) {
      router.replace("/(auth)/login");
    } else {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    }
  }, [isLast, activeIndex]);

  const handleSkip = useCallback(() => {
    router.replace("/(auth)/login");
  }, []);

  const renderItem = ({ item, index }) => {
    const inputRange = [
      (index - 1) * SCREEN_W,
      index * SCREEN_W,
      (index + 1) * SCREEN_W,
    ];
    const translateX = scrollX.interpolate({
      inputRange,
      outputRange: [-20, 0, 20],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.slide}>
        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg} />
          <Animated.Image
            source={item.image}
            style={[styles.illustration, { transform: [{ translateX }] }]}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {!isLast && (
        <Pressable
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <Animated.FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      <View style={styles.footer}>
        <PaginationDots
          count={SLIDES.length}
          activeIndex={activeIndex}
          activeColor="#1F3864"
          inactiveColor="#C9D3E8"
          style={styles.dots}
        />

        <PrimaryButton
          label={isLast ? "Get Started" : "Next"}
          onPress={handleNext}
          style={styles.nextBtn}
        />

          <PrimaryButton
          label={isLast ? "Sign In" : "Next"}
          onPress={handleNext}
          style={styles.nextBtn}
        />
      </View>
    </SafeAreaView>
  );
}

/* ─────────────────── Styles ─────────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  skipBtn: {
    position: "absolute",
    top: 52,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9AA5BC",
    fontFamily: "Poppins_600SemiBold",
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  illustrationContainer: {
    width: SCREEN_W * 0.78,
    height: SCREEN_W * 0.78,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
  },
  illustrationBg: {
    position: "absolute",
    width: SCREEN_W * 0.72,
    height: SCREEN_W * 0.72,
    borderRadius: (SCREEN_W * 0.72) / 2,
    backgroundColor: "#EEF2FF",
  },
  illustration: {
    width: SCREEN_W * 0.68,
    height: SCREEN_W * 0.68,
    zIndex: 1,
  },
  textBlock: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 35,
    fontWeight: "700",
    color: "#1F3864",
    fontFamily: "Poppins_700Bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    color: "#6B7A9A",
    fontFamily: "Poppins_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 20,
    alignItems: "center",
    gap: 20,
  },
  dots: {
    marginBottom: 4,
  },
  nextBtn: {
    width: "100%",
  },
});
