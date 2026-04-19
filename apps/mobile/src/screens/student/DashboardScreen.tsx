import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { cacheSet, cacheGet } from "../../services/storage";

interface DashData {
  studentName: string;
  className: string;
  rollNo: string;
  attendancePct: number;
  pendingFeesRs: number;
  upcomingExams: { title: string; date: string; subject: string }[];
  recentResults: { examTitle: string; marksObtained: number; totalMarks: number; grade: string }[];
  engagementScore: number;
  homeworkPending: number;
}

function Ring({ pct, size = 80, color = "#3b82f6" }: { pct: number; size?: number; color?: string }) {
  const label = `${pct}%`;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: size / 2, borderWidth: 4, borderColor: pct >= 75 ? color : "#ef4444", backgroundColor: "#1e293b" }}>
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.2 }}>{label}</Text>
    </View>
  );
}

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const CACHE_KEY = `dashboard:${user?.studentId}`;

  async function load(silent = false) {
    if (!silent) setLoading(true);
    // Try cache first
    const cached = await cacheGet<DashData>(CACHE_KEY);
    if (cached && !cached.stale) setData(cached.data);

    try {
      const { data: fresh } = await studentApi.dashboard(user?.studentId ?? "");
      setData(fresh);
      await cacheSet(CACHE_KEY, fresh);
    } catch {
      // Cached data already set above
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  const d = data ?? {} as DashData;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#3b82f6" />}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {d.studentName?.split(" ")[0] ?? user?.name} 👋</Text>
        <Text style={styles.subtext}>{d.className} · Roll #{d.rollNo}</Text>
      </View>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Ring pct={d.attendancePct ?? 0} />
          <Text style={styles.kpiLabel}>Attendance</Text>
        </View>
        <View style={styles.kpiCard}>
          <Ring pct={d.engagementScore ?? 0} color="#8b5cf6" />
          <Text style={styles.kpiLabel}>Engagement</Text>
        </View>
        <TouchableOpacity style={[styles.kpiCard, { justifyContent: "center" }]} onPress={() => router.push("/(student)/fees")}>
          <Text style={[styles.kpiValue, (d.pendingFeesRs ?? 0) > 0 ? { color: "#ef4444" } : { color: "#10b981" }]}>
            ₹{((d.pendingFeesRs ?? 0) / 1000).toFixed(1)}K
          </Text>
          <Text style={styles.kpiLabel}>Pending Fees</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Exams */}
      {(d.upcomingExams?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Exams</Text>
          {d.upcomingExams.map((ex, i) => (
            <View key={i} style={styles.listItem}>
              <View>
                <Text style={styles.itemTitle}>{ex.title}</Text>
                <Text style={styles.itemSub}>{ex.subject}</Text>
              </View>
              <Text style={styles.itemDate}>{new Date(ex.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recent Results */}
      {(d.recentResults?.length ?? 0) > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Results</Text>
          {d.recentResults.map((r, i) => (
            <View key={i} style={styles.resultItem}>
              <Text style={styles.itemTitle}>{r.examTitle}</Text>
              <View style={styles.resultRight}>
                <Text style={styles.resultScore}>{r.marksObtained}/{r.totalMarks}</Text>
                <View style={[styles.gradeBadge, { backgroundColor: r.grade === "A" || r.grade === "A+" ? "#065f46" : "#7c3aed" }]}>
                  <Text style={styles.gradeText}>{r.grade}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick links */}
      <View style={[styles.section, styles.quickLinks]}>
        {[
          { label: "Timetable", path: "/(student)/timetable" },
          { label: "Assignments", path: "/(student)/assignments" },
          { label: "Attendance", path: "/(student)/attendance" },
          { label: "My ID Card", path: "/(student)/id-card" },
        ].map(({ label, path }) => (
          <TouchableOpacity key={label} style={styles.quickBtn} onPress={() => router.push(path as any)}>
            <Text style={styles.quickBtnText}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  header: { padding: 24, paddingTop: 56 },
  greeting: { fontSize: 26, fontWeight: "800", color: "#f1f5f9" },
  subtext: { color: "#64748b", fontSize: 14, marginTop: 4 },
  kpiRow: { flexDirection: "row", paddingHorizontal: 16, gap: 12, marginBottom: 8 },
  kpiCard: { flex: 1, backgroundColor: "#1e293b", borderRadius: 16, padding: 16, alignItems: "center" },
  kpiValue: { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  kpiLabel: { color: "#94a3b8", fontSize: 11, marginTop: 8, fontWeight: "600" },
  section: { margin: 16, backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 8 },
  sectionTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 16, marginBottom: 12 },
  listItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  itemTitle: { color: "#e2e8f0", fontWeight: "600", fontSize: 14 },
  itemSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  itemDate: { color: "#3b82f6", fontWeight: "700", fontSize: 13 },
  resultItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  resultRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  resultScore: { color: "#94a3b8", fontSize: 13 },
  gradeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  gradeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  quickLinks: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 },
  quickBtn: { backgroundColor: "#1e3a8a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  quickBtnText: { color: "#93c5fd", fontWeight: "600", fontSize: 13 },
});
