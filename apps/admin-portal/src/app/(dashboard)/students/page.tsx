"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Upload,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";

interface Student {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  section?: { name: string; gradeLevel?: { name: string } };
  isActive: boolean;
  admissionDate: string;
}

interface PagedStudents {
  data: Student[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const newStudentSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  dateOfBirth: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  admissionNo: z.string().min(1, "Required"),
  sectionId: z.string().optional(),
});
type NewStudentForm = z.infer<typeof newStudentSchema>;

const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5";
const inputCls = "input w-full";

function AddStudentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewStudentForm>({
    resolver: zodResolver(newStudentSchema),
  });

  const create = useMutation({
    mutationFn: (d: NewStudentForm) => api.post("/students", d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Student added");
      qc.invalidateQueries({ queryKey: ["students"] });
      reset();
      onClose();
    },
    onError: () => toast.error("Failed to add student"),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-lg shadow-xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Add New Student</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className={labelCls}>First Name</label>
              <input id="firstName" className={inputCls} {...register("firstName")} />
              {errors.firstName && <p className="err">{errors.firstName.message}</p>}
            </div>
            <div>
              <label htmlFor="lastName" className={labelCls}>Last Name</label>
              <input id="lastName" className={inputCls} {...register("lastName")} />
              {errors.lastName && <p className="err">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="dob" className={labelCls}>Date of Birth</label>
              <input id="dob" type="date" className={inputCls} {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="err">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label htmlFor="gender" className={labelCls}>Gender</label>
              <select id="gender" className={inputCls} {...register("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="admissionNo" className={labelCls}>Admission No.</label>
            <input id="admissionNo" className={inputCls} placeholder="2024-001" {...register("admissionNo")} />
            {errors.admissionNo && <p className="err">{errors.admissionNo.message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
            <button type="submit" disabled={create.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
              {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading } = useQuery<PagedStudents>({
    queryKey: ["students", page, search],
    queryFn: () =>
      api.get("/students", { params: { page, limit: 20, search: search || undefined } }).then((r) => r.data),
    placeholderData: { data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } },
  });

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    api.post("/students/bulk-import", form).then(() => toast.success("Bulk import queued"));
  };

  return (
    <>
      <AddStudentModal open={showAdd} onClose={() => setShowAdd(false)} />
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or admission no…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition bg-card text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
            <input type="file" accept=".csv" className="sr-only" onChange={handleBulkUpload} />
          </label>
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {["Student", "Admission No", "Class", "DOB", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-muted-foreground">
                    <GraduationCap className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No students found</p>
                  </td>
                </tr>
              ) : (
                data?.data.map((s) => (
                  <tr key={s.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase shrink-0">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <span className="font-medium text-foreground">{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.admissionNo}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.section ? `${s.section.gradeLevel?.name ?? ""} ${s.section.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.dateOfBirth)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold",
                        s.isActive
                          ? "bg-green-500/10 text-green-700 dark:text-green-400"
                          : "bg-destructive/10 text-destructive"
                      )}>
                        {s.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-xs text-muted-foreground tabular-nums">
                {data.meta.total} students · Page {data.meta.page} of {data.meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  aria-label="Next page"
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground disabled:opacity-40 hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
