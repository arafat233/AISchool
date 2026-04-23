"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle2, Loader2, Save, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";

const STATUSES = ["P", "A", "L", "H", "OL"] as const;
type AttendanceStatus = (typeof STATUSES)[number];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  P: "Present",
  A: "Absent",
  L: "Late",
  H: "Holiday",
  OL: "On Leave",
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  P: "bg-green-500 text-white border-green-500",
  A: "bg-red-500 text-white border-red-500",
  L: "bg-amber-500 text-white border-amber-500",
  H: "bg-blue-500 text-white border-blue-500",
  OL: "bg-purple-500 text-white border-purple-500",
};

const STATUS_IDLE = "border-border text-muted-foreground bg-card hover:bg-muted/40";

interface Section {
  id: string;
  name: string;
  gradeLevel?: { name: string };
}

interface Student {
  id: string;
  admissionNo: string;
  user: { firstName: string; lastName: string };
}

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

const OFFLINE_QUEUE_KEY = "teacher_attendance_offline_queue";

interface QueueEntry {
  sectionId: string;
  date: string;
  records: AttendanceRecord[];
  savedAt: string;
}

function loadOfflineQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueueEntry[]) {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState<QueueEntry[]>([]);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    setOfflineQueue(loadOfflineQueue());
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["my-sections"],
    queryFn: () => api.get("/teacher/sections").then((r) => r.data),
    placeholderData: [
      { id: "s1", name: "A", gradeLevel: { name: "Grade 8" } },
      { id: "s2", name: "B", gradeLevel: { name: "Grade 9" } },
      { id: "s3", name: "C", gradeLevel: { name: "Grade 8" } },
    ],
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ["section-students", selectedSection],
    queryFn: () =>
      api.get(`/student/list`, { params: { sectionId: selectedSection } }).then((r) => r.data.data),
    enabled: !!selectedSection,
    placeholderData: selectedSection
      ? Array.from({ length: 8 }, (_, i) => ({
          id: `stu${i}`,
          admissionNo: `ADM2024${String(i + 1).padStart(3, "0")}`,
          user: { firstName: ["Arjun", "Priya", "Rahul", "Sneha", "Vikram", "Ananya", "Rohan", "Kavya"][i], lastName: "Kumar" },
        }))
      : [],
  });

  useEffect(() => {
    if (students.length > 0) {
      setMarks((prev) => {
        const next = { ...prev };
        students.forEach((s) => {
          if (!next[s.id]) next[s.id] = "P";
        });
        return next;
      });
    }
  }, [students]);

  const submitMutation = useMutation({
    mutationFn: (records: AttendanceRecord[]) =>
      api.post("/attendance/bulk", { sectionId: selectedSection, date, records }),
    onSuccess: () => {
      toast.success("Attendance saved!");
      qc.invalidateQueries({ queryKey: ["teacher-dashboard"] });
    },
    onError: () => toast.error("Failed to save"),
  });

  const handleSave = useCallback(() => {
    const records = students.map((s) => ({
      studentId: s.id,
      status: marks[s.id] ?? "P",
    }));

    if (!isOnline) {
      const entry: QueueEntry = { sectionId: selectedSection, date, records, savedAt: new Date().toISOString() };
      const queue = [...loadOfflineQueue(), entry];
      saveOfflineQueue(queue);
      setOfflineQueue(queue);
      toast.success("Saved offline — will sync when connected");
      return;
    }

    submitMutation.mutate(records);
  }, [students, marks, isOnline, selectedSection, date, submitMutation]);

  const syncOfflineQueue = useCallback(async () => {
    const queue = loadOfflineQueue();
    if (!queue.length) return;
    let synced = 0;
    for (const entry of queue) {
      try {
        await api.post("/attendance/bulk", entry);
        synced++;
      } catch {
        // Keep in queue on failure
      }
    }
    if (synced === queue.length) {
      saveOfflineQueue([]);
      setOfflineQueue([]);
      toast.success(`Synced ${synced} offline record(s)`);
    } else {
      toast.error(`Synced ${synced}/${queue.length} — some failed`);
    }
  }, []);

  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, offlineQueue.length, syncOfflineQueue]);

  const presentCount = students.filter((s) => marks[s.id] === "P").length;
  const absentCount = students.filter((s) => marks[s.id] === "A").length;

  return (
    <div className="space-y-4">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <WifiOff className="w-4 h-4 shrink-0" />
          You&apos;re offline. Attendance will be saved locally and synced when you reconnect.
        </div>
      )}

      {offlineQueue.length > 0 && isOnline && (
        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            {offlineQueue.length} offline record(s) pending sync
          </div>
          <button
            onClick={syncOfflineQueue}
            className="text-xs font-semibold hover:underline focus-visible:outline-none"
          >
            Sync now
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          aria-label="Select class section"
          className="input min-w-[180px]"
        >
          <option value="">Select class / section</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.gradeLevel?.name} — Section {s.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Attendance date"
          className="input"
        />
        {selectedSection && students.length > 0 && (
          <div className="flex gap-2 text-xs font-medium tabular-nums">
            <span className="bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-2.5 py-1.5 rounded-md">
              Present: {presentCount}
            </span>
            <span className="bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 px-2.5 py-1.5 rounded-md">
              Absent: {absentCount}
            </span>
            <span className="bg-muted text-muted-foreground border border-border px-2.5 py-1.5 rounded-md">
              Total: {students.length}
            </span>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <span
            key={s}
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${STATUS_COLORS[s]}`}
          >
            {s} — {STATUS_LABELS[s]}
          </span>
        ))}
      </div>

      {/* Student roster */}
      {!selectedSection ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select a class to start marking attendance</p>
        </div>
      ) : loadingStudents ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Adm No</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, idx) => (
                <tr key={student.id} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {student.user.firstName} {student.user.lastName}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {student.admissionNo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {STATUSES.map((status) => (
                        <button
                          key={status}
                          onClick={() => setMarks((m) => ({ ...m, [student.id]: status }))}
                          title={STATUS_LABELS[status]}
                          className={`w-8 h-8 rounded-md text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            marks[student.id] === status ? STATUS_COLORS[status] : STATUS_IDLE
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Save bar */}
          <div className="px-4 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              {students.length} students · {presentCount} present · {absentCount} absent
            </p>
            <button
              onClick={handleSave}
              disabled={submitMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {submitMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isOnline ? (
                <Save className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {isOnline ? "Save Attendance" : "Save Offline"}
            </button>
          </div>
        </div>
      )}

      {selectedSection && students.length > 0 && submitMutation.isSuccess && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-700 dark:text-green-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Attendance saved for {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
        </div>
      )}
    </div>
  );
}
