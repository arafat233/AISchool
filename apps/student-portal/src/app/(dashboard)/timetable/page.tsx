"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type Day = (typeof DAYS)[number];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_TIMES: Record<number, string> = {
  1: "8:00–8:45",
  2: "8:45–9:30",
  3: "9:30–10:15",
  4: "10:30–11:15",
  5: "11:15–12:00",
  6: "12:00–12:45",
  7: "1:30–2:15",
  8: "2:15–3:00",
};

// Distinct subject colours (using /10 opacity for dark mode compatibility)
const SUBJECT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Mathematics:        { bg: "bg-blue-500/10",   text: "text-blue-700 dark:text-blue-400",   border: "border-blue-500/20" },
  Science:            { bg: "bg-green-500/10",  text: "text-green-700 dark:text-green-400", border: "border-green-500/20" },
  English:            { bg: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-400", border: "border-purple-500/20" },
  History:            { bg: "bg-amber-500/10",  text: "text-amber-700 dark:text-amber-400", border: "border-amber-500/20" },
  Geography:          { bg: "bg-teal-500/10",   text: "text-teal-700 dark:text-teal-400",   border: "border-teal-500/20" },
  "Physical Education": { bg: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-400", border: "border-orange-500/20" },
  "Computer Science": { bg: "bg-cyan-500/10",   text: "text-cyan-700 dark:text-cyan-400",   border: "border-cyan-500/20" },
  Hindi:              { bg: "bg-rose-500/10",   text: "text-rose-700 dark:text-rose-400",   border: "border-rose-500/20" },
  Art:                { bg: "bg-pink-500/10",   text: "text-pink-700 dark:text-pink-400",   border: "border-pink-500/20" },
};
const DEFAULT_COLOR = { bg: "bg-muted/30", text: "text-foreground", border: "border-border/50" };

interface TimetableSlot {
  day: Day;
  period: number;
  subject: string;
  teacher: string;
}

export default function TimetablePage() {
  const today = DAYS[new Date().getDay() - 1] as Day | undefined;

  const { data: slots = [] } = useQuery<TimetableSlot[]>({
    queryKey: ["student-timetable"],
    queryFn: () => api.get("/student/timetable").then((r) => r.data),
    placeholderData: [
      { day: "Monday",    period: 1, subject: "Mathematics",        teacher: "Mrs. Sharma" },
      { day: "Monday",    period: 2, subject: "English",            teacher: "Mr. Roy" },
      { day: "Monday",    period: 3, subject: "Science",            teacher: "Mrs. Nair" },
      { day: "Monday",    period: 5, subject: "History",            teacher: "Mr. Verma" },
      { day: "Monday",    period: 7, subject: "Physical Education", teacher: "Mr. Singh" },
      { day: "Tuesday",   period: 1, subject: "Hindi",              teacher: "Mrs. Joshi" },
      { day: "Tuesday",   period: 2, subject: "Mathematics",        teacher: "Mrs. Sharma" },
      { day: "Tuesday",   period: 4, subject: "Science",            teacher: "Mrs. Nair" },
      { day: "Tuesday",   period: 6, subject: "Computer Science",   teacher: "Mr. Kumar" },
      { day: "Wednesday", period: 1, subject: "English",            teacher: "Mr. Roy" },
      { day: "Wednesday", period: 3, subject: "Mathematics",        teacher: "Mrs. Sharma" },
      { day: "Wednesday", period: 5, subject: "Geography",          teacher: "Mrs. Das" },
      { day: "Wednesday", period: 7, subject: "Art",                teacher: "Ms. Pillai" },
      { day: "Thursday",  period: 2, subject: "Science",            teacher: "Mrs. Nair" },
      { day: "Thursday",  period: 4, subject: "History",            teacher: "Mr. Verma" },
      { day: "Thursday",  period: 6, subject: "Mathematics",        teacher: "Mrs. Sharma" },
      { day: "Friday",    period: 1, subject: "Computer Science",   teacher: "Mr. Kumar" },
      { day: "Friday",    period: 3, subject: "English",            teacher: "Mr. Roy" },
      { day: "Friday",    period: 5, subject: "Hindi",              teacher: "Mrs. Joshi" },
      { day: "Friday",    period: 7, subject: "Physical Education", teacher: "Mr. Singh" },
      { day: "Saturday",  period: 1, subject: "Mathematics",        teacher: "Mrs. Sharma" },
      { day: "Saturday",  period: 2, subject: "Science",            teacher: "Mrs. Nair" },
      { day: "Saturday",  period: 3, subject: "Geography",          teacher: "Mrs. Das" },
    ],
  });

  const slotMap = new Map<string, TimetableSlot>();
  slots.forEach((s) => slotMap.set(`${s.day}-${s.period}`, s));

  const subjects = [...new Set(slots.map((s) => s.subject))];

  return (
    <div className="space-y-4">
      {/* Today summary strip */}
      {today && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground font-medium mb-2">Today — {today}</p>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => {
              const slot = slotMap.get(`${today}-${p}`);
              if (!slot) return null;
              const color = SUBJECT_COLORS[slot.subject] ?? DEFAULT_COLOR;
              return (
                <div key={p} className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${color.bg} ${color.text} ${color.border}`}>
                  P{p} · {slot.subject}
                </div>
              );
            })}
            {!PERIODS.some((p) => slotMap.has(`${today}-${p}`)) && (
              <p className="text-sm text-muted-foreground">No classes today</p>
            )}
          </div>
        </div>
      )}

      {/* Full timetable grid */}
      <div className="bg-card rounded-xl border border-border overflow-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-widest w-24">Period</th>
              {DAYS.map((day) => (
                <th key={day} className={cn(
                  "px-3 py-3 text-center font-semibold uppercase tracking-widest",
                  day === today ? "text-primary" : "text-muted-foreground"
                )}>
                  {day.slice(0, 3)}
                  {day === today && <span className="ml-1 bg-primary text-primary-foreground rounded px-1 text-xs">Today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period} className="border-b border-border/50">
                <td className="px-3 py-2.5 align-top">
                  <div className="font-semibold text-foreground">P{period}</div>
                  <div className="text-muted-foreground mt-0.5 tabular-nums">{PERIOD_TIMES[period]}</div>
                </td>
                {DAYS.map((day) => {
                  const slot = slotMap.get(`${day}-${period}`);
                  const isToday = day === today;
                  return (
                    <td key={day} className={cn("px-2 py-2 align-top", isToday && "bg-primary/5")}>
                      {slot ? (() => {
                        const color = SUBJECT_COLORS[slot.subject] ?? DEFAULT_COLOR;
                        return (
                          <div className={cn("rounded-lg px-2.5 py-2 border", color.bg, color.border)}>
                            <p className={cn("font-semibold leading-none", color.text)}>{slot.subject}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{slot.teacher}</p>
                          </div>
                        );
                      })() : (
                        <div className="h-10" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subject colour legend */}
      <div className="flex items-start gap-2 flex-wrap">
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        {subjects.map((s) => {
          const color = SUBJECT_COLORS[s] ?? DEFAULT_COLOR;
          return (
            <span key={s} className={`text-xs font-medium px-2.5 py-1 rounded-md border ${color.bg} ${color.text} ${color.border}`}>
              {s}
            </span>
          );
        })}
      </div>
    </div>
  );
}
