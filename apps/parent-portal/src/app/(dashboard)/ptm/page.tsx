"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CalendarClock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function PtmPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["ptm-events"],
    queryFn: () => api.get("/ptm/events").then((r) => r.data),
  });

  const { data: slots } = useQuery({
    queryKey: ["ptm-slots", selectedEvent, selectedStaff],
    queryFn: () => api.get(`/ptm/events/${selectedEvent}/slots?staffId=${selectedStaff}`).then((r) => r.data),
    enabled: !!selectedEvent && !!selectedStaff,
  });

  const book = useMutation({
    mutationFn: (slotId: string) =>
      api.post(`/ptm/slots/${slotId}/book`, { studentId: activeChildId }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Slot booked! Check your email for confirmation.");
      qc.invalidateQueries({ queryKey: ["ptm-slots"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Booking failed"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">PTM Booking</h1>

      {/* Event list */}
      <div className="space-y-3">
        {(events ?? []).map((ev: any) => (
          <div key={ev.id} className={`bg-card rounded-xl border p-5 cursor-pointer transition ${selectedEvent === ev.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
            onClick={() => setSelectedEvent(ev.id)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{ev.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(ev.eventDate), "EEEE, dd MMMM yyyy")}</p>
                {ev.isVirtual && <span className="mt-1 inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Virtual — {ev.meetingPlatform}</span>}
                {ev.venue && <span className="mt-1 inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{ev.venue}</span>}
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">{ev.status}</span>
            </div>
          </div>
        ))}
        {!events?.length && <p className="text-sm text-muted-foreground text-center py-12">No PTM events scheduled</p>}
      </div>

      {/* Slots */}
      {selectedEvent && slots && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Available Slots</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {slots.map((slot: any) => (
              <div key={slot.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(slot.startTime), "hh:mm a")} – {format(new Date(slot.endTime), "hh:mm a")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {slot.staff?.user?.profile?.firstName} {slot.staff?.user?.profile?.lastName}
                  </p>
                </div>
                {slot.isBooked ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Booked
                  </div>
                ) : (
                  <button
                    onClick={() => book.mutate(slot.id)}
                    disabled={book.isPending}
                    className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-60">
                    Book Slot
                  </button>
                )}
              </div>
            ))}
            {!slots.length && <p className="px-5 py-6 text-sm text-muted-foreground text-center">No slots available</p>}
          </div>
        </div>
      )}
    </div>
  );
}
