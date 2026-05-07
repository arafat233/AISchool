"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2,
  BookMarked,
  Plus,
  X,
  PlayCircle,
  Users,
  Layers,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

type CourseStatus = "DRAFT" | "PUBLISHED";

interface Course {
  id: string;
  title: string;
  sectionName: string;
  subjectName: string;
  totalLessons: number;
  enrolledStudents: number;
  status: CourseStatus;
}

interface AddLessonPayload {
  title: string;
  content: string;
  videoUrl?: string;
  attachmentUrl?: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LMSPage() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState<AddLessonPayload>({
    title: "",
    content: "",
    videoUrl: "",
    attachmentUrl: "",
  });

  // Fetch courses
  const {
    data: courses = [],
    isLoading,
    isError,
  } = useQuery<Course[]>({
    queryKey: ["lms-courses", userId],
    queryFn: () =>
      api.get(`/lms/courses/teacher/${userId}`).then((r) => r.data),
    enabled: !!userId,
  });

  const addLessonMutation = useMutation({
    mutationFn: ({
      courseId,
      payload,
    }: {
      courseId: string;
      payload: AddLessonPayload;
    }) => api.post(`/lms/courses/${courseId}/lessons`, payload),
    onSuccess: () => {
      toast.success("Lesson added!");
      qc.invalidateQueries({ queryKey: ["lms-courses", userId] });
      setExpandedCourseId(null);
      setLessonForm({ title: "", content: "", videoUrl: "", attachmentUrl: "" });
    },
    onError: () => toast.error("Failed to add lesson"),
  });

  function handleAddLesson(e: React.FormEvent, courseId: string) {
    e.preventDefault();
    if (!lessonForm.title || !lessonForm.content) {
      toast.error("Title and content are required");
      return;
    }
    const payload: AddLessonPayload = { ...lessonForm };
    if (!payload.videoUrl) delete payload.videoUrl;
    if (!payload.attachmentUrl) delete payload.attachmentUrl;
    addLessonMutation.mutate({ courseId, payload });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Learning Management
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Author and manage your course lessons
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-sm text-red-700 dark:text-red-400 text-center">
          Failed to load courses. Please try refreshing.
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            No courses assigned yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Contact your administrator to get courses assigned.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => {
            const isExpanded = expandedCourseId === course.id;
            return (
              <div
                key={course.id}
                className="bg-card border border-border rounded-xl overflow-hidden"
              >
                {/* Course row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookMarked className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground text-sm truncate">
                        {course.title}
                      </h3>
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wide ${
                          course.status === "PUBLISHED"
                            ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {course.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {course.subjectName} · {course.sectionName}
                    </p>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Layers className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{course.totalLessons} lessons</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      <span className="tabular-nums">{course.enrolledStudents}</span>
                    </div>
                    <button
                      onClick={() => {
                        setExpandedCourseId(isExpanded ? null : course.id);
                        setLessonForm({
                          title: "",
                          content: "",
                          videoUrl: "",
                          attachmentUrl: "",
                        });
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none"
                    >
                      {isExpanded ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Add Lesson
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Inline lesson form */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4">
                    <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
                      <PlayCircle className="w-3.5 h-3.5 text-primary" />
                      New Lesson for &ldquo;{course.title}&rdquo;
                    </h4>
                    <form
                      onSubmit={(e) => handleAddLesson(e, course.id)}
                      className="space-y-3"
                    >
                      {/* Title */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Lesson Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lessonForm.title}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              title: e.target.value,
                            }))
                          }
                          placeholder="e.g. Introduction to Algebra"
                          className="input w-full"
                          required
                        />
                      </div>

                      {/* Content */}
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Content <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={lessonForm.content}
                          onChange={(e) =>
                            setLessonForm((f) => ({
                              ...f,
                              content: e.target.value,
                            }))
                          }
                          placeholder="Lesson content / notes for students…"
                          rows={4}
                          className="input w-full resize-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Video URL */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Video URL
                          </label>
                          <input
                            type="url"
                            value={lessonForm.videoUrl}
                            onChange={(e) =>
                              setLessonForm((f) => ({
                                ...f,
                                videoUrl: e.target.value,
                              }))
                            }
                            placeholder="https://youtube.com/..."
                            className="input w-full"
                          />
                        </div>

                        {/* Attachment URL */}
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Attachment URL
                          </label>
                          <input
                            type="url"
                            value={lessonForm.attachmentUrl}
                            onChange={(e) =>
                              setLessonForm((f) => ({
                                ...f,
                                attachmentUrl: e.target.value,
                              }))
                            }
                            placeholder="https://..."
                            className="input w-full"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={addLessonMutation.isPending}
                          className="btn-primary flex items-center gap-2"
                        >
                          {addLessonMutation.isPending && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          )}
                          Add Lesson
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
