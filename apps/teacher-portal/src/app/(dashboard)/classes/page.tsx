"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BookOpen, Users, Loader2, ChevronDown, ChevronRight } from "lucide-react";

interface SubjectClass {
  id: string;
  subject: string;
  subjectCode: string;
  class: string;
  section: string;
  sectionId: string;
  studentCount: number;
  periodsPerWeek: number;
  isClassTeacher: boolean;
}

interface Student {
  id: string;
  admissionNo: string;
  user: { firstName: string; lastName: string };
  rollNo?: number;
}

export default function ClassesPage() {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const { data: classes = [] } = useQuery<SubjectClass[]>({
    queryKey: ["my-classes"],
    queryFn: () => api.get("/teacher/classes").then((r) => r.data),
    placeholderData: [
      { id: "c1", subject: "Mathematics", subjectCode: "MATH", class: "Grade 8", section: "A", sectionId: "s1", studentCount: 42, periodsPerWeek: 5, isClassTeacher: true },
      { id: "c2", subject: "Mathematics", subjectCode: "MATH", class: "Grade 8", section: "C", sectionId: "s3", studentCount: 38, periodsPerWeek: 5, isClassTeacher: false },
      { id: "c3", subject: "Mathematics", subjectCode: "MATH", class: "Grade 9", section: "B", sectionId: "s2", studentCount: 40, periodsPerWeek: 6, isClassTeacher: false },
    ],
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery<Student[]>({
    queryKey: ["class-students", expandedClass],
    queryFn: () =>
      api.get(`/student/list`, { params: { sectionId: expandedClass } }).then((r) => r.data.data),
    enabled: !!expandedClass,
    placeholderData: expandedClass
      ? Array.from({ length: 10 }, (_, i) => ({
          id: `stu${i}`,
          admissionNo: `ADM2024${String(i + 1).padStart(3, "0")}`,
          rollNo: i + 1,
          user: {
            firstName: ["Arjun", "Priya", "Rahul", "Sneha", "Vikram", "Ananya", "Rohan", "Kavya", "Aditya", "Divya"][i],
            lastName: "Kumar",
          },
        }))
      : [],
  });

  const classTeacher = classes.find((c) => c.isClassTeacher);
  const totalStudents = classes.reduce((sum, c) => sum + c.studentCount, 0);

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border divide-x divide-border grid grid-cols-3">
        <div className="p-5 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Subjects</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{new Set(classes.map((c) => c.subject)).size}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Students</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{totalStudents}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Class Teacher</p>
            <p className="text-sm font-bold text-foreground mt-0.5 leading-tight">
              {classTeacher ? `${classTeacher.class} — ${classTeacher.section}` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Class cards */}
      <div className="space-y-3">
        {classes.map((cls) => {
          const isExpanded = expandedClass === cls.sectionId;
          return (
            <div key={cls.id} className="bg-card rounded-xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => setExpandedClass(isExpanded ? null : cls.sectionId)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{cls.subject}</span>
                    <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                      {cls.subjectCode}
                    </span>
                    {cls.isClassTeacher && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md font-medium">
                        Class Teacher
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {cls.class} — Section {cls.section}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="font-semibold text-foreground tabular-nums">{cls.studentCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Periods/wk</p>
                    <p className="font-semibold text-foreground tabular-nums">{cls.periodsPerWeek}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {loadingStudents ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Roll</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Name</th>
                          <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-widest">Admission No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id} className="border-t border-border/50 hover:bg-muted/40 transition-colors">
                            <td className="px-5 py-2.5 text-muted-foreground text-xs font-mono tabular-nums w-12">
                              {s.rollNo ?? "—"}
                            </td>
                            <td className="px-5 py-2.5 font-medium text-foreground">
                              {s.user.firstName} {s.user.lastName}
                            </td>
                            <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">
                              {s.admissionNo}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
