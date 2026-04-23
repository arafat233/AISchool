"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
type Day = (typeof DAYS)[number];

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

interface TimetableSlot {
  day: Day;
  period: number;
  startTime: string;
  endTime: string;
  subject: string;
  class: string;
  section: string;
  isSubstitute?: boolean;
}

interface SubstituteAlert {
  id: string;
  date: string;
  period: number;
  originalClass: string;
  section: string;
  absentTeacher: string;
}

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

export default function TimetablePage() {
  const today = DAYS[new Date().getDay() - 1] as Day | undefined;

  const { data: slots = [] } = useQuery<TimetableSlot[]>({
    queryKey: ["my-timetable"],
    queryFn: () => api.get("/teacher/timetable").then((r) => r.data),
    placeholderData: [
      { day: "Monday", period: 1, startTime: "8:00", endTime: "8:45", subject: "Mathematics", class: "Grade 8", section: "A" },
      { day: "Monday", period: 3, startTime: "9:30", endTime: "10:15", subject: "Mathematics", class: "Grade 9", section: "B" },
      { day: "Monday", period: 5, startTime: "11:15", endTime: "12:00", subject: "Mathematics", class: "Grade 8", section: "C" },
      { day: "Tuesday", period: 2, startTime: "8:45", endTime: "9:30", subject: "Mathematics", class: "Grade 8", section: "A" },
      { day: "Tuesday", period: 4, startTime: "10:30", endTime: "11:15", subject: "Mathematics", class: "Grade 9", section: "A", isSubstitute: true },
      { day: "Wednesday", period: 1, startTime: "8:00", endTime: "8:45", subject: "Mathematics", class: "Grade 9", section: "B" },
      { day: "Wednesday", period: 6, startTime: "12:00", endTime: "12:45", subject: "Mathematics", class: "Grade 8", section: "C" },
      { day: "Thursday", period: 2, startTime: "8:45", endTime: "9:30", subject: "Mathematics", class: "Grade 8", section: "A" },
      { day: "Thursday", period: 3, startTime: "9:30", endTime: "10:15", subject: "Mathematics", class: "Grade 9", section: "B" },
      { day: "Friday", period: 1, startTime: "8:00", endTime: "8:45", subject: "Mathematics", class: "Grade 8", section: "C" },
      { day: "Friday", period: 5, startTime: "11:15", endTime: "12:00", subject: "Mathematics", class: "Grade 8", section: "A" },
      { day: "Saturday", period: 2, startTime: "8:45", endTime: "9:30", subject: "Mathematics", class: "Grade 9", section: "B" },
    ],
  });

  const { data: substituteAlerts = [] } = useQuery<SubstituteAlert[]>({
    queryKey: ["substitute-alerts"],
    queryFn: () => api.get("/teacher/substitute-alerts").then((r) => r.data),
    placeholderData: [],
  });

  const slotMap = new Map<string, TimetableSlot>();
  slots.forEach((s) => slotMap.set(`${s.day}-${s.period}`, s));

  const totalPeriodsPerDay = (day: Day) => slots.filter((s) => s.day === day).length;

  return (
    <div className="space-y-4">
      {/* Substitute duty alerts */}
      {substituteAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            Substitute Duty Assigned ({substituteAlerts.length})
          </div>
          {substituteAlerts.map((alert) => (
            <div
              key={alert.id}
              className="flex items-center gap-3 bg-card rounded-lg px-3 py-2 text-sm border border-border"
            >
              <span className="text-amber-700 dark:text-amber-400 font-medium">Period {alert.period}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-foreground">
                {alert.originalClass} Section {alert.section}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                Covering for {alert.absentTeacher}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Weekly summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {DAYS.map((day) => {
          const count = totalPeriodsPerDay(day);
          const isToday = day === today;
          return (
            <div
              key={day}
              className={cn(
                "rounded-xl border p-3 text-center",
                isToday
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border"
              )}
            >
              <p className={cn("text-xs font-medium", isToday ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {day.slice(0, 3)}
              </p>
              <p className={cn("text-2xl font-bold mt-0.5 tabular-nums", isToday ? "text-primary-foreground" : "text-foreground")}>
                {count}
              </p>
              <p className={cn("text-xs", isToday ? "text-primary-foreground/70" : "text-muted-foreground")}>periods</p>
            </div>
          );
        })}
      </div>

      {/* Timetable grid */}
      <div className="bg-card rounded-xl border border-border overflow-auto">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-3 text-muted-foreground font-semibold uppercase tracking-widest w-20">Period</th>
              {DAYS.map((day) => (
                <th
                  key={day}
                  className={cn(
                    "px-3 py-3 text-center font-semibold uppercase tracking-widest",
                    day === today ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {day.slice(0, 3)}
                  {day === today && (
                    <span className="ml-1 text-xs bg-primary text-primary-foreground rounded px-1">Today</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map((period) => (
              <tr key={period} className="border-b border-border/50">
                <td className="px-3 py-3 align-top">
                  <div className="font-semibold text-foreground">P{period}</div>
                  <div className="text-muted-foreground text-xs mt-0.5 tabular-nums">{PERIOD_TIMES[period]}</div>
                </td>
                {DAYS.map((day) => {
                  const slot = slotMap.get(`${day}-${period}`);
                  const isToday = day === today;
                  return (
                    <td key={day} className={cn("px-2 py-2 align-top", isToday && "bg-primary/5")}>
                      {slot ? (
                        <div
                          className={cn(
                            "rounded-lg px-2.5 py-2 border",
                            slot.isSubstitute
                              ? "bg-amber-500/10 border-amber-500/20"
                              : isToday
                              ? "bg-primary/10 border-primary/20"
                              : "bg-primary/5 border-primary/10"
                          )}
                        >
                          <p
                            className={cn(
                              "font-semibold leading-none",
                              slot.isSubstitute ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                            )}
                          >
                            {slot.subject}
                          </p>
                          <p className="text-muted-foreground mt-1">
                            {slot.class} {slot.section}
                          </p>
                          {slot.isSubstitute && (
                            <span className="inline-block mt-1 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                              Sub
                            </span>
                          )}
                        </div>
                      ) : (
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5" />
        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md font-medium">Sub</span>
        indicates a substitute duty assigned to you
      </div>
    </div>
  );
}
