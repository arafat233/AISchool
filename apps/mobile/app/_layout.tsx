import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as Updates from "expo-updates";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
  const { hydrate, isLoading } = useAuthStore();

  useEffect(() => {
    hydrate();
    // OTA update check
    async function checkUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch { /* non-fatal in dev */ }
    }
    checkUpdate();
  }, []);

  if (isLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0f172a" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </GestureHandlerRootView>
  );
}
