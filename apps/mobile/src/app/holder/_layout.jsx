import React from "react";
import { Tabs } from "expo-router";
import HolderTabBar from "./_HolderTabBar";

const TABS_CONFIG = {
  index: { icon: "home", label: "Home" },
  creds: { icon: "square-check", label: "Cards" },
  wallet: { icon: "files", label: "Wallet" },
  profile: { icon: "person", label: "Profile" },
};

export default function HolderLayout() {
  return (
    <Tabs
      tabBar={(props) => <HolderTabBar {...props} tabsConfig={TABS_CONFIG} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="cards" options={{ title: "Cards" }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
