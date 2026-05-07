"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import {
  Loader2,
  CalendarDays,
  Plus,
  X,
  Video,
  MapPin,
  Users,
  Clock,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ──────────────────────────────────────────────────────────────────────

type MeetingMode = "ONLINE" | "OFFLINE";

interface Section {
  id: string;
  name: string;
  gradeLevel?: { name: string };
}

interface PTMMeeting {
  id: string;
  sectionName: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  mode: MeetingMode;
  meetLink?: string;
  bookedSlots: number;
  totalSlots: number;
}

interface CreatePTMPayload {
  sectionId: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  mode: MeetingMode;
  meetLink?: string;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PTMPage() {
  const qc = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id) ?? "";

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePTMPayload>({
    sectionId: "",
    meetingDate: "",
    startTime: "",
    endTime: "",
    mode: "OFFLINE",
    meetLink: "",
  });

  // Fetch meetings
  const {
    data: meetings = [],
    isLoading,
    isError,
  } = useQuery<PTMMeeting[]>({
    queryKey: ["ptm-meetings", userId],
    queryFn: () =>
      api.get(`/academic/ptm/teacher/${userId}`).then((r) => r.data),
    enabled: !!userId,
  });

  // Sections dropdown
  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["my-sections"],
    queryFn: () => api.get("/teacher/sections").then((r) => r.data),
    enabled: showForm,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreatePTMPayload) =>
      api.post("/academic/ptm", payload),
    onSuccess: () => {
      toast.success("Meeting slot created!");
      qc.invalidateQueries({ queryKey: ["ptm-meetings", userId] });
      setShowForm(false);
      setForm({
        sectionId: "",
        meetingDate: "",
        startTime: "",
        endTime: "",
        mode: "OFFLINE",
        meetLink: "",
      });
    },
    onError: () => toast.error("Failed to create meeting slot"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !form.sectionId ||
      !form.meetingDate ||
      !form.startTime ||
      !form.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (form.mode === "ONLINE" && !form.meetLink) {
      toast.error("A meeting link is required for online meetings");
      return;
    }
    const payload: CreatePTMPayload = { ...form };
    if (payload.mode !== "ONLINE") delete payload.meetLink;
    createMutation.mutate(payload);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Parent-Teacher Meetings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule and manage PTM slots for your sections
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn-primary flex items-center gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "Schedule Meeting"}
        </button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            New Meeting Slot
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

              {/* Meeting Date */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Meeting Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.meetingDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meetingDate: e.target.value }))
                  }
                  className="input w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Time */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startTime: e.target.value }))
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* End Time */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, endTime: e.target.value }))
                  }
                  className="input w-full"
                  required
                />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mode <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={form.mode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        mode: e.target.value as MeetingMode,
                      }))
                    }
                    className="input w-full appearance-none pr-8"
                  >
                    <option value="OFFLINE">In-person</option>
                    <option value="ONLINE">Online</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Meet Link — only for ONLINE */}
            {form.mode === "ONLINE" && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Meeting Link <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={form.meetLink}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, meetLink: e.target.value }))
                  }
                  placeholder="https://meet.google.com/..."
                  className="input w-full"
                  required={form.mode === "ONLINE"}
                />
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="btn-primary flex items-center gap-2"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Slot
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
          Failed to load meetings. Please try refreshing.
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground font-medium">
            No meetings scheduled yet
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Click &ldquo;Schedule Meeting&rdquo; to create your first PTM slot.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Date
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Section
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Mode
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  Bookings
                </th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                    {new Date(meeting.meetingDate).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {meeting.sectionName}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      {meeting.startTime} – {meeting.endTime}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border ${
                        meeting.mode === "ONLINE"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {meeting.mode === "ONLINE" ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      {meeting.mode === "ONLINE" ? "Online" : "In-person"}
                    </span>
                    {meeting.mode === "ONLINE" && meeting.meetLink && (
                      <a
                        href={meeting.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[10px] text-primary hover:underline mt-0.5 truncate max-w-[160px]"
                      >
                        Join link
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <div className="flex-1 bg-muted rounded-full h-1.5 min-w-[50px]">
                        <div
                          className="bg-primary h-1.5 rounded-full"
                          style={{
                            width:
                              meeting.totalSlots > 0
                                ? `${(meeting.bookedSlots / meeting.totalSlots) * 100}%`
                                : "0%",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {meeting.bookedSlots}/{meeting.totalSlots}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">
              {meetings.length} meeting slot{meetings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
