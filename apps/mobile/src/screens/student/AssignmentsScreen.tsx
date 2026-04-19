import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Assignment {
  id: string; subject: string; title: string; description: string;
  dueDate: string; type: "ASSIGNMENT" | "QUIZ"; submitted: boolean; score?: number;
}
interface QuizQuestion { id: string; question: string; options: string[]; }

export default function AssignmentsScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<{ id: string; questions: QuizQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "SUBMITTED">("PENDING");

  useEffect(() => {
    studentApi.assignments(user?.studentId ?? "")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleUpload(assignment: Assignment) {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as any);
    try {
      await studentApi.submitAssignment(assignment.id, form);
      setItems((prev) => prev.map((a) => a.id === assignment.id ? { ...a, submitted: true } : a));
      Alert.alert("Submitted", "Assignment uploaded successfully.");
    } catch { Alert.alert("Error", "Upload failed. Check your connection."); }
  }

  async function loadQuiz(id: string) {
    const { data } = await studentApi.quizzes(user?.studentId ?? "");
    const quiz = data.find((q: any) => q.id === id);
    if (quiz) { setActiveQuiz({ id, questions: quiz.questions }); setAnswers({}); }
  }

  async function submitQuiz() {
    if (!activeQuiz) return;
    setQuizSubmitting(true);
    try {
      const result = await studentApi.submitQuiz(activeQuiz.id, answers);
      Alert.alert("Quiz Submitted", `Score: ${result.data.score}/${result.data.total}`);
      setActiveQuiz(null);
      setItems((prev) => prev.map((a) => a.id === activeQuiz.id ? { ...a, submitted: true, score: result.data.score } : a));
    } catch { Alert.alert("Error", "Could not submit quiz."); }
    finally { setQuizSubmitting(false); }
  }

  const filtered = items.filter((i) => {
    if (filter === "PENDING") return !i.submitted;
    if (filter === "SUBMITTED") return i.submitted;
    return true;
  });

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(["ALL", "PENDING", "SUBMITTED"] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterTab, filter === f && styles.filterTabActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {filtered.length === 0 && <Text style={styles.empty}>Nothing here.</Text>}
        {filtered.map((item) => (
          <View key={item.id} style={[styles.card, item.submitted && styles.cardDone]}>
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: item.type === "QUIZ" ? "#4c1d95" : "#1e3a8a" }]}>
                <Text style={styles.typeText}>{item.type}</Text>
              </View>
              {item.submitted && <Text style={styles.doneText}>✓ Submitted{item.score !== undefined ? ` · ${item.score}` : ""}</Text>}
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubject}>{item.subject}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={[styles.cardDue, new Date(item.dueDate) < new Date() && !item.submitted ? { color: "#ef4444" } : {}]}>
              Due: {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
            {!item.submitted && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => item.type === "QUIZ" ? loadQuiz(item.id) : handleUpload(item)}
              >
                <Text style={styles.actionBtnText}>{item.type === "QUIZ" ? "Start Quiz" : "Upload Submission"}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Quiz Modal */}
      <Modal visible={!!activeQuiz} animationType="slide" onRequestClose={() => setActiveQuiz(null)}>
        <View style={styles.quizContainer}>
          <View style={styles.quizHeader}>
            <Text style={styles.quizTitle}>Online Quiz</Text>
            <TouchableOpacity onPress={() => setActiveQuiz(null)}><Text style={styles.closeBtn}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {activeQuiz?.questions.map((q, qi) => (
              <View key={q.id} style={styles.question}>
                <Text style={styles.qText}>{qi + 1}. {q.question}</Text>
                {q.options.map((opt, oi) => (
                  <TouchableOpacity key={oi} style={[styles.option, answers[q.id] === oi && styles.optionSelected]} onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}>
                    <Text style={[styles.optionText, answers[q.id] === oi && { color: "#fff" }]}>{String.fromCharCode(65 + oi)}. {opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <TouchableOpacity style={styles.submitQuizBtn} onPress={submitQuiz} disabled={quizSubmitting}>
              {quizSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitQuizText}>Submit Quiz</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingTop: Platform.OS === "ios" ? 56 : 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#1e293b" },
  filterTabActive: { backgroundColor: "#3b82f6" },
  filterText: { color: "#64748b", fontWeight: "600", fontSize: 13 },
  filterTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: "#475569", marginTop: 40, fontSize: 15 },
  card: { backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardDone: { opacity: 0.65 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { color: "#c7d2fe", fontWeight: "700", fontSize: 11 },
  doneText: { color: "#10b981", fontWeight: "600", fontSize: 12 },
  cardTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 16, marginBottom: 2 },
  cardSubject: { color: "#3b82f6", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  cardDesc: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  cardDue: { color: "#64748b", fontSize: 12, marginBottom: 10 },
  actionBtn: { backgroundColor: "#1e3a8a", borderRadius: 10, padding: 12, alignItems: "center" },
  actionBtnText: { color: "#93c5fd", fontWeight: "700" },
  quizContainer: { flex: 1, backgroundColor: "#0f172a" },
  quizHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  quizTitle: { color: "#f1f5f9", fontSize: 20, fontWeight: "800" },
  closeBtn: { color: "#94a3b8", fontSize: 18, padding: 4 },
  question: { marginBottom: 24 },
  qText: { color: "#e2e8f0", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  option: { backgroundColor: "#1e293b", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#334155" },
  optionSelected: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  optionText: { color: "#94a3b8", fontSize: 14 },
  submitQuizBtn: { backgroundColor: "#3b82f6", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8, marginBottom: 40 },
  submitQuizText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
