import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });

  // Register token with backend
  try {
    await api.post("/notifications/device-token", { token, platform: Platform.OS });
  } catch {
    // Non-fatal — token will be re-sent on next app open
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1e3a8a",
    });
    await Notifications.setNotificationChannelAsync("fees", {
      name: "Fee Reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync("attendance", {
      name: "Attendance Alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return token;
}

export function useNotificationListener(
  onNotification: (n: Notifications.Notification) => void,
  onResponse: (r: Notifications.NotificationResponse) => void,
) {
  const sub1 = Notifications.addNotificationReceivedListener(onNotification);
  const sub2 = Notifications.addNotificationResponseReceivedListener(onResponse);
  return () => { sub1.remove(); sub2.remove(); };
}
