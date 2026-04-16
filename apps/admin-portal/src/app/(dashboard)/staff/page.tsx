"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Search, Loader2, UserCog } from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatarUrl?: string;
}

interface PagedStaff {
  data: StaffMember[];
  meta: { total: number; page: number; totalPages: number };
}

const ROLE_LABEL: Record<string, string> = {
  TEACHER: "Teacher",
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  LIBRARIAN: "Librarian",
  STAFF: "Staff",
};

const ROLE_COLOR: Record<string, string> = {
  TEACHER: "bg-blue-50 text-blue-700",
  ADMIN: "bg-purple-50 text-purple-700",
  ACCOUNTANT: "bg-amber-50 text-amber-700",
  LIBRARIAN: "bg-teal-50 text-teal-700",
  STAFF: "bg-gray-100 text-gray-600",
};

export default function StaffPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<PagedStaff>({
    queryKey: ["staff", page, search],
    queryFn: () =>
      api.get("/users", { params: { page, limit: 20, search: search || undefined, excludeRole: "STUDENT,PARENT" } }).then((r) => r.data),
    placeholderData: { data: [], meta: { total: 0, page: 1, totalPages: 1 } },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-gray-50/50">
              {["Name", "Email", "Role", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={4} className="py-16 text-center text-muted-foreground">
                <UserCog className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>No staff found</p>
              </td></tr>
            ) : data?.data.map((s) => (
              <tr key={s.id} className="border-b border-border/50 hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold uppercase">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <span className="font-medium text-gray-900">{s.firstName} {s.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLOR[s.role] ?? "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABEL[s.role] ?? s.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
