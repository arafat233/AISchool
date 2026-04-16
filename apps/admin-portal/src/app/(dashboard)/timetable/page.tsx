"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { Plus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat",
};

interface Section { id: string; name: string; gradeLevel?: { name: string } }
interface Subject { id: string; name: string; code: string }
interface TimetableSlot {
  id: string; dayOfWeek: string; startTime: string; endTime: string;
  subject?: { name: string }; teacher?: { user?: { firstName: string; lastName: string } }
}

const slotSchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  dayOfWeek: z.enum(["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  periodNumber: z.coerce.number().min(1),
  teacherId: z.string().optional(),
  academicYearId: z.string().optional(),
});
type SlotForm = z.infer<typeof slotSchema>;

export default function TimetablePage() {
  const qc = useQueryClient();
  const [selectedSection, setSelectedSection] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["sections"],
    queryFn: () => api.get("/academic/sections").then((r) => r.data),
    placeholderData: [],
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: () => api.get("/academic/subjects").then((r) => r.data),
    placeholderData: [],
  });

  const { data: timetable = [], isLoading } = useQuery<TimetableSlot[]>({
    queryKey: ["timetable", selectedSection],
    queryFn: () =>
      api.get(`/academic/timetable/${selectedSection}`).then((r) => r.data),
    enabled: !!selectedSection,
    placeholderData: [],
  });

  const { register, handleSubmit, reset } = useForm<SlotForm>({
    resolver: zodResolver(slotSchema),
    defaultValues: { sectionId: selectedSection },
  });

  const addSlot = useMutation({
    mutationFn: (d: SlotForm) => api.post("/academic/timetable", d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Slot added");
      qc.invalidateQueries({ queryKey: ["timetable"] });
      reset();
      setShowAdd(false);
    },
    onError: () => toast.error("Conflict or error adding slot"),
  });

  const deleteSlot = useMutation({
    mutationFn: (id: string) => api.delete(`/academic/timetable/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Slot removed"); qc.invalidateQueries({ queryKey: ["timetable"] }); },
  });

  // Group by day
  const byDay: Record<string, TimetableSlot[]> = {};
  DAYS.forEach((d) => { byDay[d] = []; });
  timetable.forEach((s) => { byDay[s.dayOfWeek]?.push(s); });

  return (
    <>
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Timetable Slot</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => addSlot.mutate({ ...d, sectionId: selectedSection }))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Subject</label>
                <select className="input w-full" {...register("subjectId")}>
                  <option value="">Select subject…</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Day</label>
                  <select className="input w-full" {...register("dayOfWeek")}>
                    {DAYS.map((d) => <option key={d} value={d}>{DAY_SHORT[d]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Period #</label>
                  <input type="number" className="input w-full" {...register("periodNumber")} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">Start Time</label>
                  <input type="time" className="input w-full" {...register("startTime")} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">End Time</label>
                  <input type="time" className="input w-full" {...register("endTime")} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={addSlot.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {addSlot.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Controls */}
        <div className="flex items-center gap-3">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="input max-w-xs"
          >
            <option value="">Select section…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.gradeLevel?.name} - Section {s.name}
              </option>
            ))}
          </select>
          {selectedSection && (
            <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2 ml-auto">
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          )}
        </div>

        {!selectedSection ? (
          <div className="bg-white rounded-xl border border-border py-20 text-center text-muted-foreground">
            Select a section to view or edit its timetable.
          </div>
        ) : isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-6 divide-x divide-border border-b border-border">
              {DAYS.map((day) => (
                <div key={day} className="px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center bg-gray-50/50">
                  {DAY_SHORT[day]}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-6 divide-x divide-border min-h-[400px]">
              {DAYS.map((day) => (
                <div key={day} className="p-2 space-y-2">
                  {byDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime)).map((slot) => (
                    <div
                      key={slot.id}
                      className="group relative bg-primary/5 border border-primary/20 rounded-lg p-2 text-xs"
                    >
                      <p className="font-semibold text-primary truncate">
                        {slot.subject?.name ?? "—"}
                      </p>
                      <p className="text-muted-foreground">{slot.startTime} – {slot.endTime}</p>
                      {slot.teacher?.user && (
                        <p className="text-muted-foreground truncate">
                          {slot.teacher.user.firstName} {slot.teacher.user.lastName}
                        </p>
                      )}
                      <button
                        onClick={() => deleteSlot.mutate(slot.id)}
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-destructive transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
