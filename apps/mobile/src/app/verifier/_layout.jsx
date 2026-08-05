import React from "react";
import { Tabs } from "expo-router";
import BottomTabBar from "../../components/dashboard/BottomTabBar";

const TABS_CONFIG = {
  index: { icon: "home", label: "Home" },
  verify: { icon: "badge", label: "Verify" },
  history: { icon: "history", label: "History" },
  more: { icon: "more-horiz", label: "More" },
};

export default function VerifierLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} tabsConfig={TABS_CONFIG} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="verify" options={{ title: "Verify" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
      <Tabs.Screen name="verification-result" options={{ href: null }} />
    </Tabs>
  );
}