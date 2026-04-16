"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
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
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Add New Student</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit((d) => create.mutate(d))} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">First Name</label>
              <input className="input" {...register("firstName")} />
              {errors.firstName && <p className="err">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Last Name</label>
              <input className="input" {...register("lastName")} />
              {errors.lastName && <p className="err">{errors.lastName.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Date of Birth</label>
              <input type="date" className="input" {...register("dateOfBirth")} />
              {errors.dateOfBirth && <p className="err">{errors.dateOfBirth.message}</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">Gender</label>
              <select className="input" {...register("gender")}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 block mb-1">Admission No.</label>
            <input className="input" placeholder="2024-001" {...register("admissionNo")} />
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
      api
        .get("/students", { params: { page, limit: 20, search: search || undefined } })
        .then((r) => r.data),
    placeholderData: {
      data: [],
      meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
    },
  });

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    api.post("/students/bulk-import", form).then(() => {
      toast.success("Bulk import queued");
    });
  };

  return (
    <>
      <AddStudentModal open={showAdd} onClose={() => setShowAdd(false)} />
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or admission no…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  Student
                </th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  Admission No
                </th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  Class
                </th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  DOB
                </th>
                <th className="text-left px-4 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
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
                  <td colSpan={5} className="py-16 text-center text-muted-foreground">
                    <GraduationCap className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p>No students found</p>
                  </td>
                </tr>
              ) : (
                data?.data.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                          {s.firstName[0]}{s.lastName[0]}
                        </div>
                        <span className="font-medium text-gray-900">{s.firstName} {s.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.admissionNo}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.section ? `${s.section.gradeLevel?.name ?? ""} ${s.section.name}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.dateOfBirth)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
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
              <p className="text-xs text-muted-foreground">
                {data.meta.total} students · Page {data.meta.page} of {data.meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded border border-border text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded border border-border text-gray-600 disabled:opacity-40 hover:bg-gray-50"
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
