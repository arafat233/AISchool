"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  Star,
  Upload,
  Loader2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

type AssignmentStatus = "PENDING" | "SUBMITTED" | "GRADED";

interface Assignment {
  id: string;
  subject: string;
  title: string;
  description?: string;
  dueDate: string;
  status: AssignmentStatus;
  marksObtained?: number;
  totalMarks?: number;
  grade?: string;
  submittedAt?: string;
}

type FilterTab = "ALL" | AssignmentStatus;

const STATUS_CONFIG: Record<AssignmentStatus, { label: string; cls: string; icon: React.ElementType }> = {
  PENDING:   { label: "Pending",   cls: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",   icon: Clock        },
  SUBMITTED: { label: "Submitted", cls: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",       icon: CheckCircle2 },
  GRADED:    { label: "Graded",    cls: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20",   icon: Star         },
};

export default function AssignmentsPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<FilterTab>("ALL");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingAssignmentId = useRef<string>("");

  const { data: assignments = [], isLoading, isError } = useQuery<Assignment[]>({
    queryKey: ["assignments", studentId],
    queryFn: () => api.get(`/lms/assignments/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
    placeholderData: [
      { id: "a1", subject: "Mathematics", title: "Quadratic Equations — Practice Set", dueDate: "2026-05-10", status: "PENDING", totalMarks: 20 },
      { id: "a2", subject: "Physics", title: "Newton's Laws — Lab Report", dueDate: "2026-05-08", status: "PENDING", totalMarks: 30 },
      { id: "a3", subject: "English", title: "Essay: Climate Change", dueDate: "2026-04-30", status: "SUBMITTED", submittedAt: "2026-04-29", totalMarks: 25 },
      { id: "a4", subject: "Chemistry", title: "Periodic Table Worksheet", dueDate: "2026-04-20", status: "GRADED", marksObtained: 18, totalMarks: 20, grade: "A" },
      { id: "a5", subject: "History", title: "French Revolution Summary", dueDate: "2026-04-15", status: "GRADED", marksObtained: 22, totalMarks: 25, grade: "A+" },
    ],
  });

  const submitAssignment = useMutation({
    mutationFn: ({ assignmentId, formData }: { assignmentId: string; formData: FormData }) =>
      api.post(`/lms/assignments/${assignmentId}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Assignment submitted successfully");
      setUploading(null);
      queryClient.invalidateQueries({ queryKey: ["assignments", studentId] });
    },
    onError: () => {
      toast.error("Submission failed. Please try again.");
      setUploading(null);
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !pendingAssignmentId.current) return;
    const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Unsupported file type. Allowed: PDF, PNG, JPG, DOC, DOCX");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must not exceed 10 MB");
      e.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(pendingAssignmentId.current);
    submitAssignment.mutate({ assignmentId: pendingAssignmentId.current, formData });
    e.target.value = "";
  }

  function triggerUpload(assignmentId: string) {
    pendingAssignmentId.current = assignmentId;
    fileInputRef.current?.click();
  }

  const filtered = tab === "ALL" ? assignments : assignments.filter((a) => a.status === tab);

  const counts = {
    ALL: assignments.length,
    PENDING: assignments.filter((a) => a.status === "PENDING").length,
    SUBMITTED: assignments.filter((a) => a.status === "SUBMITTED").length,
    GRADED: assignments.filter((a) => a.status === "GRADED").length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <AlertTriangle className="w-8 h-8 opacity-40" />
        <p className="text-sm">Failed to load assignments</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-4 divide-x divide-border">
        {([
          { label: "Total", key: "ALL", icon: ClipboardList, cls: "text-muted-foreground" },
          { label: "Pending", key: "PENDING", icon: Clock, cls: "text-amber-500" },
          { label: "Submitted", key: "SUBMITTED", icon: CheckCircle2, cls: "text-blue-500" },
          { label: "Graded", key: "GRADED", icon: Star, cls: "text-green-500" },
        ] as const).map(({ label, key, icon: Icon, cls }) => (
          <div key={key} className="p-5 flex items-start gap-3">
            <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", cls)} />
            <div>
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{counts[key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border">
        {(["ALL", "PENDING", "SUBMITTED", "GRADED"] as FilterTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium capitalize transition focus-visible:outline-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:transition-colors",
              tab === t
                ? "text-foreground after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent"
            )}
          >
            {t === "ALL" ? "All" : STATUS_CONFIG[t].label}
            <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">
              ({counts[t]})
            </span>
          </button>
        ))}
      </div>

      {/* Assignment list */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-16 flex flex-col items-center text-muted-foreground gap-3">
          <ClipboardList className="w-8 h-8 opacity-20" />
          <p className="text-sm">No assignments in this category</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const cfg = STATUS_CONFIG[a.status];
            const StatusIcon = cfg.icon;
            const isOverdue = a.status === "PENDING" && new Date(a.dueDate) < new Date();
            const isSubmitting = uploading === a.id;

            return (
              <div key={a.id} className="bg-card rounded-xl border border-border px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                        {a.subject}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border",
                          cfg.cls
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border text-red-700 dark:text-red-400 bg-red-500/10 border-red-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground">{a.title}</p>
                    {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due {formatDate(a.dueDate)}
                      </span>
                      {a.submittedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                          Submitted {formatDate(a.submittedAt)}
                        </span>
                      )}
                      {a.totalMarks && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {a.totalMarks} marks
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {a.status === "GRADED" && a.marksObtained !== undefined && (
                      <div className="text-right">
                        <p className="text-lg font-bold tabular-nums text-foreground">
                          {a.marksObtained}/{a.totalMarks}
                        </p>
                        {a.grade && (
                          <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">
                            {a.grade}
                          </span>
                        )}
                      </div>
                    )}
                    {a.status === "PENDING" && (
                      <button
                        onClick={() => triggerUpload(a.id)}
                        disabled={isSubmitting}
                        className="btn-primary flex items-center gap-2 text-xs disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        Submit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
