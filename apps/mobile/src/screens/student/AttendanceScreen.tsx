import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { format, subDays } from "date-fns";

interface AttendanceRecord { date: string; status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE"; }

const STATUS_COLOR: Record<string, string> = {
  PRESENT: "#10b981",
  ABSENT: "#ef4444",
  LATE: "#f59e0b",
  LEAVE: "#8b5cf6",
};

export default function AttendanceScreen() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ fromDate: "", toDate: "", reason: "", type: "SICK" });
  const [submitting, setSubmitting] = useState(false);

  const from = format(subDays(new Date(), 90), "yyyy-MM-dd");
  const to = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    studentApi.attendance(user?.studentId ?? "", from, to)
      .then((r) => setRecords(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalDays = records.length;
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const pct = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

  async function submitLeave() {
    if (!leaveForm.fromDate || !leaveForm.reason) { Alert.alert("Fill all fields"); return; }
    setSubmitting(true);
    try {
      await studentApi.applyLeave({ ...leaveForm, studentId: user?.studentId });
      Alert.alert("Leave applied", "Your leave application has been submitted.");
      setLeaveModal(false);
    } catch { Alert.alert("Error", "Could not submit leave. Try again."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.pctCircle}>
          <Text style={[styles.pctText, pct < 75 ? { color: "#ef4444" } : {}]}>{pct}%</Text>
          <Text style={styles.pctLabel}>Attendance</Text>
        </View>
        <View style={styles.stats}>
          {[["Present", present, "#10b981"], ["Absent", absent, "#ef4444"], ["Late", late, "#f59e0b"]].map(([label, val, color]) => (
            <View key={label as string} style={styles.stat}>
              <Text style={[styles.statVal, { color: color as string }]}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </View>
      {pct < 75 && (
        <View style={styles.warning}><Text style={styles.warningText}>⚠️ Attendance below 75% — risk of eligibility issues</Text></View>
      )}

      {/* Apply Leave */}
      <TouchableOpacity style={styles.leaveBtn} onPress={() => setLeaveModal(true)}>
        <Text style={styles.leaveBtnText}>+ Apply for Leave</Text>
      </TouchableOpacity>

      {/* Records list */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {records.slice().reverse().map((r, i) => (
          <View key={i} style={styles.record}>
            <Text style={styles.recordDate}>
              {new Date(r.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </Text>
            <View style={[styles.badge, { backgroundColor: STATUS_COLOR[r.status] + "20" }]}>
              <Text style={[styles.badgeText, { color: STATUS_COLOR[r.status] }]}>{r.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Leave modal */}
      <Modal visible={leaveModal} animationType="slide" transparent onRequestClose={() => setLeaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            {[
              { label: "From Date (YYYY-MM-DD)", key: "fromDate" as const },
              { label: "To Date (YYYY-MM-DD)", key: "toDate" as const },
              { label: "Reason", key: "reason" as const },
            ].map(({ label, key }) => (
              <TextInput key={key} style={styles.modalInput} placeholder={label} placeholderTextColor="#475569"
                value={leaveForm[key]} onChangeText={(v) => setLeaveForm((f) => ({ ...f, [key]: v }))} />
            ))}
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLeaveModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={submitLeave} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  summary: { flexDirection: "row", alignItems: "center", padding: 24, paddingTop: 56, gap: 24 },
  pctCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: "#3b82f6", backgroundColor: "#1e293b", alignItems: "center", justifyContent: "center" },
  pctText: { color: "#f1f5f9", fontSize: 22, fontWeight: "800" },
  pctLabel: { color: "#64748b", fontSize: 10 },
  stats: { flex: 1, flexDirection: "row", justifyContent: "space-around" },
  stat: { alignItems: "center" },
  statVal: { fontSize: 24, fontWeight: "800" },
  statLabel: { color: "#64748b", fontSize: 11, marginTop: 2 },
  warning: { backgroundColor: "#7c2d12", marginHorizontal: 16, borderRadius: 10, padding: 10 },
  warningText: { color: "#fca5a5", fontSize: 13, fontWeight: "600" },
  leaveBtn: { margin: 16, backgroundColor: "#1e293b", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#334155", alignItems: "center" },
  leaveBtnText: { color: "#3b82f6", fontWeight: "700" },
  record: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  recordDate: { color: "#e2e8f0", fontSize: 14 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontWeight: "700", fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "#00000090", justifyContent: "flex-end" },
  modal: { backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "800", marginBottom: 20 },
  modalInput: { backgroundColor: "#0f172a", color: "#f1f5f9", borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, padding: 14, alignItems: "center" },
  cancelBtnText: { color: "#94a3b8", fontWeight: "700" },
  submitBtn: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontWeight: "700" },
});
