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
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-sidebar rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Subjects</p>
            <p className="text-2xl font-bold text-gray-900">{new Set(classes.map((c) => c.subject)).size}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Class Teacher</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5 leading-tight">
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
            <div key={cls.id} className="bg-white rounded-xl border border-border overflow-hidden">
              {/* Header row */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left"
                onClick={() => setExpandedClass(isExpanded ? null : cls.sectionId)}
              >
                <div className="w-10 h-10 rounded-lg bg-sidebar/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-sidebar" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{cls.subject}</span>
                    <span className="text-xs text-muted-foreground font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                      {cls.subjectCode}
                    </span>
                    {cls.isClassTeacher && (
                      <span className="text-xs bg-sidebar text-white px-2 py-0.5 rounded-full font-medium">
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
                    <p className="font-semibold text-gray-900">{cls.studentCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Periods/week</p>
                    <p className="font-semibold text-gray-900">{cls.periodsPerWeek}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Expanded student list */}
              {isExpanded && (
                <div className="border-t border-border">
                  {loadingStudents ? (
                    <div className="py-8 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Roll</th>
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                          <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Admission No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s.id} className="border-t border-border/50 hover:bg-gray-50/30">
                            <td className="px-5 py-2.5 text-muted-foreground text-xs font-mono w-12">
                              {s.rollNo ?? "—"}
                            </td>
                            <td className="px-5 py-2.5 font-medium">
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
