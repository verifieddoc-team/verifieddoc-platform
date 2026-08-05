import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../constants/theme";

const TAB_ICONS = {
  index: require("../../../assets/images/icons/Vector.png"),
  creds: require("../../../assets/images/icons/square-check.png"),
  wallet: require("../../../assets/images/icons/files.png"),
  profile: require("../../../assets/images/icons/camera.png"),
};

const TAB_LABELS = {
  index: "Home",
  creds: "Creds",
  wallet: "Wallet",
  profile: "Profile",
};

export default function HolderTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.wrapper, { paddingBottom: insets.bottom || SPACING.sm }]}
    >
      {state.routes.map((route, index) => {
        const isActive = state.index === index;
        const label = TAB_LABELS[route.name] ?? route.name;
        const iconSource = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isActive && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            hitSlop={6}
          >
            <View style={[styles.iconWrap, isActive && styles.iconWrapActive]}>
              {iconSource ? (
                <Image
                  source={iconSource}
                  style={[
                    styles.tabIcon,
                    { tintColor: isActive ? COLORS.surface : COLORS.primary },
                  ]}
                  resizeMode="contain"
                />
              ) : null}
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceTint,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrap: {
    width: 68,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
  iconWrapActive: {
    backgroundColor: COLORS.accent,
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 3,
    maxWidth: 60,
  },
  labelActive: {
    color: COLORS.surface,
  },
});
