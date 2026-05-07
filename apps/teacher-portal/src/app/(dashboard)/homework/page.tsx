"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2,
  BookOpen,
  Plus,
  X,
  FileText,
  Calendar,
  Users,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  name: string;
  gradeLevel?: { name: string };
}

interface Subject {
  id: string;
  name: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  attachmentUrl?: string;
  submissionCount: number;
  section: { id: string; name: string; gradeLevel?: { name: string } };
  subject: { id: string; name: string };
}

interface CreateHomeworkPayload {
  sectionId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  attachmentUrl?: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function HomeworkPage() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateHomeworkPayload>({
    sectionId: "",
    subjectId: "",
    title: "",
    description: "",
    dueDate: "",
    attachmentUrl: "",
  });

  // Fetch homework list
  const {
    data: homeworkList = [],
    isLoading,
    isError,
  } = useQuery<HomeworkItem[]>({
    queryKey: ["teacher-homework", userId],
    queryFn: () =>
      api.get(`/academic/homework/teacher/${userId}`).then((r) => r.data),
    enabled: !!userId,
  });

  // Fetch sections for form dropdown
  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["my-sections"],
    queryFn: () => api.get("/teacher/sections").then((r) => r.data),
    enabled: showForm,
  });

  // Fetch subjects for form dropdown
  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["my-subjects"],
    queryFn: () => api.get("/teacher/subjects").then((r) => r.data),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateHomeworkPayload) =>
      api.post("/academic/homework", payload),
    onSuccess: () => {
      toast.success("Homework assignment created!");
      qc.invalidateQueries({ queryKey: ["teacher-homework", userId] });
      setShowForm(false);
      setForm({
        sectionId: "",
        subjectId: "",
        title: "",
        description: "",
        dueDate: "",
        attachmentUrl: "",
      });
    },
    onError: () => toast.error("Failed to create homework"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sectionId || !form.subjectId || !form.title || !form.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const payload: CreateHomeworkPayload = { ...form };
    if (!payload.attachmentUrl) delete payload.attachmentUrl;
    if (!payload.description) delete payload.description;
    createMutation.mutate(payload);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Homework</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and track homework assignments for your classes
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Add Homework"}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Homework Assignment
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Section */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.sectionId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sectionId: e.target.value }))
                    }
                    className="input w-full appearance-none pr-8"
                    required
                  >
                    <option value="">Select section</option>
                    {sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.gradeLevel?.name} — Section {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Subject <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.subjectId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, subjectId: e.target.value }))
                    }
                    className="input w-full appearance-none pr-8"
                    required
                  >
                    <option value="">Select subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Chapter 5 — Exercises 1-10"
                className="input w-full"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional instructions or notes for students"
                rows={3}
                className="input w-full resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Due Date */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* Attachment URL */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Attachment URL
                </label>
                <input
                  type="url"
                  value={form.attachmentUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, attachmentUrl: e.target.value }))
                  }
                  placeholder="https://..."
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Assignment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-sm text-red-700 dark:text-red-400 text-center">
          Failed to load homework assignments. Please try refreshing.
        </div>
      ) : homeworkList.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            No homework assignments yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Click &ldquo;Add Homework&rdquo; to create your first assignment.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Section
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Subject
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Due Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Submissions
                </th>
              </tr>
            </thead>
            <tbody>
              {homeworkList.map((hw) => {
                const dueDate = new Date(hw.dueDate);
                const isOverdue = dueDate < new Date();
                return (
                  <tr
                    key={hw.id}
                    className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground">
                          {hw.title}
                        </span>
                      </div>
                      {hw.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6 line-clamp-1">
                          {hw.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {hw.section.gradeLevel?.name
                        ? `${hw.section.gradeLevel.name} — Sec ${hw.section.name}`
                        : `Section ${hw.section.name}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {hw.subject.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`flex items-center gap-1.5 text-xs font-medium ${
                          isOverdue
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        {dueDate.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {isOverdue && (
                          <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                            Overdue
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        {hw.submissionCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
