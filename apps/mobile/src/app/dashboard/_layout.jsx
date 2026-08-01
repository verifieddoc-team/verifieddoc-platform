import React from "react";
import { Tabs } from "expo-router";
import BottomTabBar from "../../components/dashboard/BottomTabBar";

export default function DashboardLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="issue" options={{ title: "Issue" }} />
      <Tabs.Screen name="manage" options={{ title: "Manage" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
