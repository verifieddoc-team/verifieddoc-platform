import { Tabs } from "expo-router";
import {
  Home,
  MoreHorizontal,
  Share2,
  WalletCards,
} from "lucide-react-native";
import { colors } from "../../theme";

function TabIcon({ Icon, color, focused }) {
  return <Icon color={color} fill={focused ? `${color}18` : "none"} size={22} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.indigo,
        tabBarInactiveTintColor: colors.gray,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.divider,
          height: 68,
          paddingBottom: 8,
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="credentials"
        options={{
          title: "Credentials",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={WalletCards} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="share"
        options={{
          title: "Share",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Share2} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={MoreHorizontal} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
