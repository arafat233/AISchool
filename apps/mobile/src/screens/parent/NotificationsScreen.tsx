import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity,
} from "react-native";
import { parentApi, studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { registerForPushNotifications } from "../../services/notifications";

interface NotifPref {
  type: string;
  label: string;
  description: string;
  push: boolean;
  sms: boolean;
  whatsapp: boolean;
}

const DEFAULT_PREFS: NotifPref[] = [
  { type: "ATTENDANCE", label: "Attendance Alerts", description: "Absent or late notifications", push: true, sms: true, whatsapp: true },
  { type: "FEE_DUE", label: "Fee Reminders", description: "Due dates and overdue alerts", push: true, sms: true, whatsapp: false },
  { type: "RESULT", label: "Result Published", description: "Exam results and report cards", push: true, sms: false, whatsapp: true },
  { type: "TRANSPORT", label: "Bus Alerts", description: "Bus departed / arrived school", push: true, sms: false, whatsapp: false },
  { type: "EXAM", label: "Exam Timetable", description: "Upcoming exam reminders", push: true, sms: false, whatsapp: false },
  { type: "CIRCULAR", label: "Circulars & Events", description: "School announcements", push: true, sms: false, whatsapp: false },
  { type: "LEAVE", label: "Leave Status", description: "Leave approved / rejected", push: true, sms: true, whatsapp: false },
];

interface Notification { id: string; title: string; body: string; type: string; createdAt: string; read: boolean; }

export default function NotificationsScreen() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState<NotifPref[]>(DEFAULT_PREFS);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"inbox" | "settings">("inbox");

  useEffect(() => {
    // Register push token
    registerForPushNotifications().catch(() => {});

    Promise.all([
      studentApi.notifications(),
      parentApi.notifPrefs(user?.id ?? ""),
    ]).then(([notifs, savedPrefs]) => {
      setNotifications(notifs.data);
      if (savedPrefs.data && Array.isArray(savedPrefs.data)) {
        setPrefs((cur) => cur.map((p) => {
          const saved = savedPrefs.data.find((s: any) => s.type === p.type);
          return saved ? { ...p, ...saved } : p;
        }));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function togglePref(type: string, channel: "push" | "sms" | "whatsapp") {
    setPrefs((prev) => prev.map((p) => p.type === type ? { ...p, [channel]: !p[channel] } : p));
  }

  async function savePrefs() {
    setSaving(true);
    try {
      await parentApi.updateNotifPrefs(user?.id ?? "", prefs);
      Alert.alert("Saved", "Notification preferences updated.");
    } catch { Alert.alert("Error", "Could not save preferences."); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {(["inbox", "settings"] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "inbox" ? "Inbox" : "Preferences"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "inbox" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {notifications.length === 0 && <Text style={styles.empty}>No notifications yet.</Text>}
          {notifications.map((n) => (
            <View key={n.id} style={[styles.notifCard, !n.read && styles.notifUnread]}>
              <View style={styles.notifHeader}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifTime}>
                  {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
              </View>
              <Text style={styles.notifBody}>{n.body}</Text>
              {!n.read && <View style={styles.unreadDot} />}
            </View>
          ))}
        </ScrollView>
      )}

      {tab === "settings" && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Channel headers */}
          <View style={styles.channelHeader}>
            <Text style={styles.channelHeaderText}>Notification Type</Text>
            <View style={styles.channelIcons}>
              {["Push", "SMS", "WhatsApp"].map((c) => (
                <Text key={c} style={styles.channelIcon}>{c}</Text>
              ))}
            </View>
          </View>

          {prefs.map((pref) => (
            <View key={pref.type} style={styles.prefRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.prefLabel}>{pref.label}</Text>
                <Text style={styles.prefDesc}>{pref.description}</Text>
              </View>
              <View style={styles.channelToggles}>
                <Switch value={pref.push} onValueChange={() => togglePref(pref.type, "push")} trackColor={{ true: "#3b82f6" }} />
                <Switch value={pref.sms} onValueChange={() => togglePref(pref.type, "sms")} trackColor={{ true: "#3b82f6" }} />
                <Switch value={pref.whatsapp} onValueChange={() => togglePref(pref.type, "whatsapp")} trackColor={{ true: "#25d366" }} />
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn} onPress={savePrefs} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Preferences</Text>}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  tabs: { flexDirection: "row", backgroundColor: "#1e293b", margin: 16, marginTop: 56, borderRadius: 12, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 9 },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#94a3b8", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: "#475569", marginTop: 40 },
  notifCard: { backgroundColor: "#1e293b", borderRadius: 14, padding: 14, marginBottom: 10, position: "relative" },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: "#3b82f6" },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  notifTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 14, flex: 1 },
  notifTime: { color: "#475569", fontSize: 11 },
  notifBody: { color: "#94a3b8", fontSize: 13 },
  unreadDot: { position: "absolute", top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: "#3b82f6" },
  channelHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  channelHeaderText: { flex: 1, color: "#64748b", fontSize: 12, fontWeight: "700" },
  channelIcons: { flexDirection: "row", gap: 8, width: 150, justifyContent: "flex-end" },
  channelIcon: { color: "#64748b", fontSize: 10, fontWeight: "700", width: 44, textAlign: "center" },
  prefRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  prefLabel: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
  prefDesc: { color: "#64748b", fontSize: 12, marginTop: 2 },
  channelToggles: { flexDirection: "row", gap: 4, width: 150, justifyContent: "flex-end" },
  saveBtn: { backgroundColor: "#3b82f6", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 20, marginBottom: 40 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
