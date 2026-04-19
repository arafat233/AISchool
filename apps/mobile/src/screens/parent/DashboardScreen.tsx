import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { parentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Child {
  id: string; name: string; rollNo: string; className: string;
  attendancePct: number; pendingFeesRs: number; recentGrade: string;
}

export default function ParentDashboard() {
  const { user, setActiveChild } = useAuthStore();
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [activeId, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const { data } = await parentApi.children(user?.parentId ?? "");
      setChildren(data);
      if (!activeId && data.length > 0) { setActive(data[0].id); setActiveChild(data[0].id); }
    } catch { /* use cached */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { load(); }, []);

  const activeChild = children.find((c) => c.id === activeId);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#3b82f6" />}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(" ")[0] ?? "Parent"} 👋</Text>
        <Text style={styles.sub}>Parent Dashboard</Text>
      </View>

      {/* Child switcher */}
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switcher} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {children.map((c) => (
            <TouchableOpacity key={c.id} style={[styles.childChip, activeId === c.id && styles.childChipActive]}
              onPress={() => { setActive(c.id); setActiveChild(c.id); }}>
              <View style={styles.childAvatar}><Text style={styles.childAvatarText}>{c.name[0]}</Text></View>
              <Text style={[styles.childName, activeId === c.id && { color: "#fff" }]}>{c.name.split(" ")[0]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Active child snapshot */}
      {activeChild && (
        <>
          <View style={styles.snapshot}>
            <Text style={styles.childFullName}>{activeChild.name}</Text>
            <Text style={styles.childMeta}>{activeChild.className} · Roll #{activeChild.rollNo}</Text>
          </View>

          <View style={styles.kpiRow}>
            <View style={[styles.kpiCard, { borderColor: activeChild.attendancePct < 75 ? "#ef4444" : "#10b981" }]}>
              <Text style={[styles.kpiVal, { color: activeChild.attendancePct < 75 ? "#ef4444" : "#10b981" }]}>{activeChild.attendancePct}%</Text>
              <Text style={styles.kpiLbl}>Attendance</Text>
            </View>
            <TouchableOpacity style={[styles.kpiCard, { borderColor: activeChild.pendingFeesRs > 0 ? "#f59e0b" : "#10b981" }]}
              onPress={() => router.push("/(parent)/fees")}>
              <Text style={[styles.kpiVal, { color: activeChild.pendingFeesRs > 0 ? "#f59e0b" : "#10b981" }]}>
                ₹{(activeChild.pendingFeesRs / 1000).toFixed(1)}K
              </Text>
              <Text style={styles.kpiLbl}>Fees Due</Text>
            </TouchableOpacity>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiVal}>{activeChild.recentGrade || "—"}</Text>
              <Text style={styles.kpiLbl}>Latest Grade</Text>
            </View>
          </View>

          {/* Quick nav */}
          <View style={styles.nav}>
            {[
              { label: "Attendance", emoji: "📅", path: "/(parent)/attendance" },
              { label: "Results", emoji: "📊", path: "/(parent)/results" },
              { label: "Fee Pay", emoji: "💰", path: "/(parent)/fees" },
              { label: "Bus Track", emoji: "🚌", path: "/(parent)/transport" },
              { label: "Notifications", emoji: "🔔", path: "/(parent)/notifications" },
              { label: "Homework", emoji: "📚", path: "/(parent)/attendance" },
            ].map(({ label, emoji, path }) => (
              <TouchableOpacity key={label} style={styles.navItem} onPress={() => router.push(path as any)}>
                <Text style={styles.navEmoji}>{emoji}</Text>
                <Text style={styles.navLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  header: { padding: 24, paddingTop: 56 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#f1f5f9" },
  sub: { color: "#64748b", fontSize: 14, marginTop: 4 },
  switcher: { paddingBottom: 12 },
  childChip: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, gap: 8 },
  childChipActive: { backgroundColor: "#3b82f6" },
  childAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#334155", alignItems: "center", justifyContent: "center" },
  childAvatarText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  childName: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  snapshot: { paddingHorizontal: 24, paddingBottom: 8 },
  childFullName: { color: "#f1f5f9", fontSize: 20, fontWeight: "800" },
  childMeta: { color: "#64748b", fontSize: 13, marginTop: 4 },
  kpiRow: { flexDirection: "row", paddingHorizontal: 16, gap: 10, marginVertical: 16 },
  kpiCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  kpiVal: { color: "#f1f5f9", fontSize: 20, fontWeight: "800" },
  kpiLbl: { color: "#64748b", fontSize: 11, marginTop: 4, fontWeight: "600" },
  nav: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 12, marginBottom: 32 },
  navItem: { width: "30%", backgroundColor: "#1e293b", borderRadius: 16, padding: 16, alignItems: "center" },
  navEmoji: { fontSize: 26, marginBottom: 6 },
  navLabel: { color: "#94a3b8", fontSize: 12, fontWeight: "600", textAlign: "center" },
});
