"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Megaphone, FileText, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { format } from "date-fns";

export default function AnnouncementsPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get("/notifications/announcements").then((r) => r.data),
  });

  const { data: events } = useQuery({
    queryKey: ["school-events"],
    queryFn: () => api.get("/academic/calendar/events").then((r) => r.data),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Announcements & Events</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-gray-800">School Announcements</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(data ?? []).map((a: any) => (
            <div key={a.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{format(new Date(a.createdAt), "dd MMM yyyy, hh:mm a")}</p>
                </div>
                {a.attachmentUrl && (
                  <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0">
                    <FileText className="w-3 h-3" />
                    Circular
                  </a>
                )}
              </div>
            </div>
          ))}
          {!data?.length && <p className="px-5 py-8 text-sm text-gray-400 text-center">No announcements</p>}
        </div>
      </div>

      {events?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Upcoming Events</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {events.slice(0, 20).map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-4 px-5 py-3">
                <div className="text-center w-12 shrink-0">
                  <p className="text-lg font-bold text-primary leading-none">{format(new Date(ev.date), "dd")}</p>
                  <p className="text-xs text-gray-500">{format(new Date(ev.date), "MMM")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{ev.title}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    ev.type === "HOLIDAY" ? "bg-rose-50 text-rose-600" :
                    ev.type === "EXAM"    ? "bg-amber-50 text-amber-600" :
                    "bg-blue-50 text-blue-600"
                  }`}>{ev.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
