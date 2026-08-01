import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS, SPACING } from "../../constants/theme";

const TAB_ICONS = {
  index: "home",
  issue: "verified",
  manage: "manage-accounts",
  more: "more-horiz",
};

const TAB_LABELS = {
  index: "Home",
  issue: "Issue",
  manage: "Manage",
  more: "More",
};

/**
 * Custom tabBar renderer for an Expo Router <Tabs> navigator.
 * Matches the reference design: active tab gets a gold pill with a
 * white icon/label, inactive tabs are plain primary-blue.
 */
export default function BottomTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom || SPACING.sm }]}>
      {state.routes.map((route, index) => {
        const isActive = state.index === index;
        const iconName = TAB_ICONS[route.name] ?? "circle";
        const label = TAB_LABELS[route.name] ?? route.name;

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
              <MaterialIcons
                name={iconName}
                size={22}
                color={isActive ? COLORS.surface : COLORS.primary}
              />
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    minWidth: 72,
  },
  iconWrapActive: {
    backgroundColor: COLORS.accent,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 3,
  },
  labelActive: {
    color: COLORS.surface,
  },
});
