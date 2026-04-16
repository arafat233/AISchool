"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { Plus, X, Loader2, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

interface GradeLevel {
  id: string;
  name: string;
  order: number;
  sections: Section[];
}
interface Section {
  id: string;
  name: string;
  capacity: number;
  _count?: { students: number };
}

const gradeLevelSchema = z.object({ name: z.string().min(1), order: z.coerce.number() });
const sectionSchema = z.object({
  name: z.string().min(1),
  gradeLevelId: z.string().min(1),
  capacity: z.coerce.number().min(1),
});

export default function ClassesPage() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);

  const { data: grades = [], isLoading } = useQuery<GradeLevel[]>({
    queryKey: ["grade-levels"],
    queryFn: () => api.get("/academic/grade-levels").then((r) => r.data),
    placeholderData: [],
  });

  const { register: rgGrade, handleSubmit: hsGrade, reset: resetGrade } = useForm<z.infer<typeof gradeLevelSchema>>({
    resolver: zodResolver(gradeLevelSchema),
  });
  const { register: rgSection, handleSubmit: hsSection, reset: resetSection } = useForm<z.infer<typeof sectionSchema>>({
    resolver: zodResolver(sectionSchema),
  });

  const addGrade = useMutation({
    mutationFn: (d: z.infer<typeof gradeLevelSchema>) =>
      api.post("/academic/grade-levels", d).then((r) => r.data),
    onSuccess: () => { toast.success("Grade level added"); qc.invalidateQueries({ queryKey: ["grade-levels"] }); resetGrade(); setShowGradeForm(false); },
    onError: () => toast.error("Failed"),
  });

  const addSection = useMutation({
    mutationFn: (d: z.infer<typeof sectionSchema>) =>
      api.post("/academic/sections", d).then((r) => r.data),
    onSuccess: () => { toast.success("Section added"); qc.invalidateQueries({ queryKey: ["grade-levels"] }); resetSection(); setShowSectionForm(false); },
    onError: () => toast.error("Failed"),
  });

  const toggle = (id: string) =>
    setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <button onClick={() => setShowSectionForm(true)} className="btn-secondary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Section
        </button>
        <button onClick={() => setShowGradeForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Grade
        </button>
      </div>

      {/* Add Grade modal */}
      {showGradeForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Grade Level</h2>
              <button onClick={() => setShowGradeForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={hsGrade((d) => addGrade.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Name (e.g. Grade 10)</label>
                <input className="input w-full" {...rgGrade("name")} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Order</label>
                <input type="number" className="input w-full" {...rgGrade("order")} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowGradeForm(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={addGrade.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {addGrade.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Section modal */}
      {showSectionForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Section</h2>
              <button onClick={() => setShowSectionForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={hsSection((d) => addSection.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Grade Level</label>
                <select className="input w-full" {...rgSection("gradeLevelId")}>
                  <option value="">Select grade…</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Section Name (e.g. A)</label>
                <input className="input w-full" {...rgSection("name")} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Capacity</label>
                <input type="number" className="input w-full" defaultValue={40} {...rgSection("capacity")} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowSectionForm(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={addSection.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {addSection.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade levels list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : grades.length === 0 ? (
          <div className="bg-white rounded-xl border border-border py-16 text-center text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No grade levels yet. Add one to get started.</p>
          </div>
        ) : (
          grades.map((grade) => (
            <div key={grade.id} className="bg-white rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => toggle(grade.id)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition"
              >
                {expanded.includes(grade.id) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="font-semibold text-gray-900">{grade.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {grade.sections.length} section{grade.sections.length !== 1 ? "s" : ""}
                </span>
              </button>
              {expanded.includes(grade.id) && (
                <div className="border-t border-border">
                  {grade.sections.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted-foreground">No sections yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {grade.sections.map((sec) => (
                        <div key={sec.id} className="flex items-center px-5 py-3 text-sm">
                          <span className="w-24 font-medium text-gray-700">Section {sec.name}</span>
                          <span className="text-muted-foreground">
                            {sec._count?.students ?? 0} / {sec.capacity} students
                          </span>
                          <div className="ml-auto flex items-center gap-1">
                            <div
                              className="h-1.5 rounded-full bg-primary/20 w-24 overflow-hidden"
                            >
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${Math.min(100, ((sec._count?.students ?? 0) / sec.capacity) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
