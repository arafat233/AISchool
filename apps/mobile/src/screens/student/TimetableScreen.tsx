import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { cacheSet, cacheGet } from "../../services/storage";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLORS = ["#1e3a8a", "#4c1d95", "#065f46", "#7c2d12", "#1e3a8a", "#312e81"];

interface Period { time: string; subject: string; teacher: string; room: string; }
type Timetable = Record<string, Period[]>;

interface HomeworkItem { subject: string; description: string; dueDate: string; submitted: boolean; }

export default function TimetableScreen() {
  const { user } = useAuthStore();
  const [timetable, setTimetable] = useState<Timetable>({});
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() - 1] ?? "Monday");
  const [loading, setLoading] = useState(true);
  const CACHE_KEY = `timetable:${user?.classId}`;

  useEffect(() => {
    (async () => {
      const cached = await cacheGet<{ timetable: Timetable; homework: HomeworkItem[] }>(CACHE_KEY);
      if (cached) { setTimetable(cached.data.timetable); setHomework(cached.data.homework); }
      try {
        const [tt, hw] = await Promise.all([
          studentApi.timetable(user?.classId ?? ""),
          studentApi.assignments(user?.studentId ?? ""),
        ]);
        setTimetable(tt.data);
        setHomework(hw.data.filter((h: HomeworkItem) => !h.submitted));
        await cacheSet(CACHE_KEY, { timetable: tt.data, homework: hw.data });
      } catch { /* use cached */ } finally { setLoading(false); }
    })();
  }, []);

  const periods = timetable[activeDay] ?? [];

  if (loading && Object.keys(timetable).length === 0)
    return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Day tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {DAYS.map((d, i) => (
          <TouchableOpacity key={d} style={[styles.dayTab, activeDay === d && styles.dayTabActive]} onPress={() => setActiveDay(d)}>
            <Text style={[styles.dayTabText, activeDay === d && styles.dayTabTextActive]}>{d.slice(0, 3)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* Timetable */}
        <Text style={styles.sectionTitle}>{activeDay} Schedule</Text>
        {periods.length === 0 ? (
          <Text style={styles.empty}>No periods scheduled</Text>
        ) : periods.map((p, i) => (
          <View key={i} style={[styles.periodCard, { borderLeftColor: COLORS[i % COLORS.length] }]}>
            <Text style={styles.periodTime}>{p.time}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.periodSubject}>{p.subject}</Text>
              <Text style={styles.periodMeta}>{p.teacher} · {p.room}</Text>
            </View>
          </View>
        ))}

        {/* Homework checklist */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pending Homework</Text>
        {homework.length === 0 ? (
          <Text style={styles.empty}>All caught up! No pending homework.</Text>
        ) : homework.map((h, i) => (
          <View key={i} style={styles.hwItem}>
            <View style={styles.hwCheck} />
            <View style={{ flex: 1 }}>
              <Text style={styles.hwSubject}>{h.subject}</Text>
              <Text style={styles.hwDesc} numberOfLines={2}>{h.description}</Text>
            </View>
            <Text style={[styles.hwDue, new Date(h.dueDate) < new Date() ? { color: "#ef4444" } : {}]}>
              {new Date(h.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  dayTabs: { paddingTop: 56, paddingBottom: 8, maxHeight: 96 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: "#1e293b" },
  dayTabActive: { backgroundColor: "#3b82f6" },
  dayTabText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  dayTabTextActive: { color: "#fff" },
  sectionTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 16, marginBottom: 12 },
  empty: { color: "#475569", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  periodCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4 },
  periodTime: { color: "#64748b", fontSize: 12, fontWeight: "600", width: 72 },
  periodSubject: { color: "#e2e8f0", fontWeight: "700", fontSize: 15 },
  periodMeta: { color: "#64748b", fontSize: 12, marginTop: 2 },
  hwItem: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#1e293b", borderRadius: 12, padding: 14, marginBottom: 10, gap: 12 },
  hwCheck: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: "#334155", marginTop: 2 },
  hwSubject: { color: "#e2e8f0", fontWeight: "700", fontSize: 14 },
  hwDesc: { color: "#64748b", fontSize: 12, marginTop: 3 },
  hwDue: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
});
