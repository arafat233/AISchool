import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { Redirect } from "expo-router";

export default function ParentLayout() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || user?.role !== "PARENT") return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#1e293b", borderTopColor: "#334155", borderTopWidth: 1 },
        tabBarActiveTintColor: "#8b5cf6",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: "Fees", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="transport" options={{ title: "Bus", tabBarIcon: ({ color, size }) => <Ionicons name="bus" size={size} color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts", tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} /> }} />
    </Tabs>
  );
}
