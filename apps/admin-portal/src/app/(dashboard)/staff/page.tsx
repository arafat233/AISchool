"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Search, Loader2, UserCog, ChevronLeft, ChevronRight } from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
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

const ROLE_STYLE: Record<string, string> = {
  TEACHER: "bg-primary/10 text-primary",
  ADMIN: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  ACCOUNTANT: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  LIBRARIAN: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
  STAFF: "bg-muted text-muted-foreground",
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {["Name", "Email", "Role", "Status"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={4} className="py-20 text-center text-muted-foreground">
                <UserCog className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No staff found</p>
              </td></tr>
            ) : data?.data.map((s) => (
              <tr key={s.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                      {s.firstName[0]}{s.lastName[0]}
                    </div>
                    <span className="font-medium text-foreground">{s.firstName} {s.lastName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-semibold", ROLE_STYLE[s.role] ?? "bg-muted text-muted-foreground")}>
                    {ROLE_LABEL[s.role] ?? s.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex px-2 py-0.5 rounded-md text-xs font-semibold",
                    s.isActive ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
                  )}>
                    {s.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.meta.total} staff · Page {data.meta.page} of {data.meta.totalPages}
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
  );
}
