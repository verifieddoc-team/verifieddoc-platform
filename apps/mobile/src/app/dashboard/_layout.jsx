import React from "react";
import { Tabs } from "expo-router";
import BottomTabBar from "../../components/dashboard/BottomTabBar";

const TABS_CONFIG = {
  index: { icon: "home", label: "Home" },
  issue: { icon: "verified", label: "Issue" },
  manage: { icon: "manage-accounts", label: "Manage" },
  more: { icon: "more-horiz", label: "More" },
};

export default function DashboardLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} tabsConfig={TABS_CONFIG} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="issue" options={{ title: "Issue" }} />
      <Tabs.Screen name="manage" options={{ title: "Manage" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
