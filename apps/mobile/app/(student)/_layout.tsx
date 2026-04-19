import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/store/authStore";
import { Redirect } from "expo-router";

export default function StudentLayout() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || user?.role !== "STUDENT") return <Redirect href="/auth/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#1e293b", borderTopColor: "#334155", borderTopWidth: 1 },
        tabBarActiveTintColor: "#3b82f6",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ title: "Home", tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="timetable" options={{ title: "Timetable", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance", tabBarIcon: ({ color, size }) => <Ionicons name="checkmark-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="assignments" options={{ title: "Assignments", tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} /> }} />
      <Tabs.Screen name="lms" options={{ title: "Courses", tabBarIcon: ({ color, size }) => <Ionicons name="play-circle" size={size} color={color} /> }} />
      <Tabs.Screen name="fees" options={{ title: "Fees", tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} /> }} />
      <Tabs.Screen name="id-card" options={{ title: "ID Card", tabBarIcon: ({ color, size }) => <Ionicons name="card" size={size} color={color} /> }} />
    </Tabs>
  );
}
