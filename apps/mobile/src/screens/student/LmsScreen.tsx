import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Lesson { id: string; title: string; videoUrl: string; duration: number; completed: boolean; order: number; }
interface Course {
  id: string; title: string; subject: string; teacher: string;
  progress: number; totalLessons: number; completedLessons: number;
  lessons: Lesson[];
}

export default function LmsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingLesson, setPlayingLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    studentApi.courses(user?.studentId ?? "")
      .then((r) => setCourses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleLessonPress(course: Course, lesson: Lesson) {
    if (lesson.videoUrl) {
      setPlayingLesson(lesson);
      router.push({ pathname: "/(student)/video-player", params: { url: lesson.videoUrl, title: lesson.title, lessonId: lesson.id } });
    } else {
      Alert.alert("No video", "Video not available offline. Connect to internet to watch.");
    }
  }

  async function markComplete(lessonId: string, courseId: string) {
    try {
      await studentApi.markLesson(lessonId);
      setCourses((prev) => prev.map((c) => c.id === courseId ? {
        ...c,
        completedLessons: c.completedLessons + 1,
        progress: Math.round(((c.completedLessons + 1) / c.totalLessons) * 100),
        lessons: c.lessons.map((l) => l.id === lessonId ? { ...l, completed: true } : l),
      } : c));
    } catch { /* non-fatal */ }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingTop: 56 }}>
      <Text style={styles.pageTitle}>My Courses</Text>
      {courses.length === 0 && <Text style={styles.empty}>No courses enrolled.</Text>}
      {courses.map((course) => (
        <View key={course.id} style={styles.courseCard}>
          <TouchableOpacity onPress={() => setExpanded(expanded === course.id ? null : course.id)}>
            <View style={styles.courseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.courseMeta}>{course.subject} · {course.teacher}</Text>
              </View>
              <Text style={styles.chevron}>{expanded === course.id ? "▲" : "▼"}</Text>
            </View>
            {/* Progress bar */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${course.progress}%` as any }]} />
            </View>
            <Text style={styles.progressLabel}>{course.completedLessons}/{course.totalLessons} lessons · {course.progress}%</Text>
          </TouchableOpacity>

          {expanded === course.id && (
            <View style={styles.lessonList}>
              {course.lessons.sort((a, b) => a.order - b.order).map((lesson) => (
                <TouchableOpacity key={lesson.id} style={[styles.lessonItem, lesson.completed && styles.lessonDone]}
                  onPress={() => handleLessonPress(course, lesson)}>
                  <View style={[styles.lessonCheck, lesson.completed && styles.lessonCheckDone]}>
                    {lesson.completed && <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <Text style={styles.lessonDuration}>{Math.round(lesson.duration / 60)} min</Text>
                  </View>
                  <Text style={styles.playBtn}>▶</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  pageTitle: { color: "#f1f5f9", fontSize: 24, fontWeight: "800", marginBottom: 20 },
  empty: { color: "#475569", textAlign: "center", marginTop: 40, fontSize: 15 },
  courseCard: { backgroundColor: "#1e293b", borderRadius: 16, padding: 16, marginBottom: 12 },
  courseHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  courseTitle: { color: "#f1f5f9", fontWeight: "700", fontSize: 16 },
  courseMeta: { color: "#64748b", fontSize: 13, marginTop: 2 },
  chevron: { color: "#475569", fontSize: 12, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 3 },
  progressLabel: { color: "#64748b", fontSize: 12 },
  lessonList: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#334155", paddingTop: 12 },
  lessonItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 12 },
  lessonDone: { opacity: 0.6 },
  lessonCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#475569", alignItems: "center", justifyContent: "center" },
  lessonCheckDone: { backgroundColor: "#10b981", borderColor: "#10b981" },
  lessonTitle: { color: "#e2e8f0", fontSize: 14, fontWeight: "600" },
  lessonDuration: { color: "#64748b", fontSize: 12, marginTop: 2 },
  playBtn: { color: "#3b82f6", fontSize: 16 },
});
