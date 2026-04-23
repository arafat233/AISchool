"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, X, Loader2, Search, CreditCard, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

type Tab = "invoices" | "outstanding" | "structure";

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  dueDate: string;
  student: { firstName: string; lastName: string; admissionNo: string };
}

interface OutstandingItem {
  studentId: string;
  studentName: string;
  admissionNo: string;
  outstanding: number;
  overdueCount: number;
}

interface FeeHead { id: string; name: string; description?: string }

const feeHeadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-500/10 text-green-700 dark:text-green-400",
  PARTIAL: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  UNPAID: "bg-destructive/10 text-destructive",
  OVERDUE: "bg-destructive/15 text-destructive font-semibold",
};

const TAB_LABELS: Record<Tab, string> = {
  invoices: "Invoices",
  outstanding: "Outstanding",
  structure: "Fee Structure",
};

const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5";

export default function FeesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("invoices");
  const [search, setSearch] = useState("");
  const [showAddHead, setShowAddHead] = useState(false);

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["invoices", search],
    queryFn: () => api.get("/fees/invoices", { params: { search: search || undefined } }).then((r) => r.data),
    placeholderData: [],
    enabled: tab === "invoices",
  });

  const { data: outstanding = [], isLoading: loadingOutstanding } = useQuery<OutstandingItem[]>({
    queryKey: ["outstanding"],
    queryFn: () => api.get("/fees/outstanding").then((r) => r.data),
    placeholderData: [],
    enabled: tab === "outstanding",
  });

  const { data: feeHeads = [] } = useQuery<FeeHead[]>({
    queryKey: ["fee-heads"],
    queryFn: () => api.get("/fees/heads").then((r) => r.data),
    placeholderData: [],
    enabled: tab === "structure",
  });

  const { register, handleSubmit, reset } = useForm<z.infer<typeof feeHeadSchema>>({
    resolver: zodResolver(feeHeadSchema),
  });

  const addHead = useMutation({
    mutationFn: (d: z.infer<typeof feeHeadSchema>) => api.post("/fees/heads", d).then((r) => r.data),
    onSuccess: () => { toast.success("Fee head added"); qc.invalidateQueries({ queryKey: ["fee-heads"] }); reset(); setShowAddHead(false); },
    onError: () => toast.error("Failed"),
  });

  return (
    <>
      {showAddHead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl w-full max-w-sm shadow-xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Add Fee Head</h2>
              <button
                onClick={() => setShowAddHead(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit((d) => addHead.mutate(d))} className="p-6 space-y-4">
              <div>
                <label htmlFor="fh-name" className={labelCls}>Name</label>
                <input id="fh-name" className="input w-full" placeholder="Tuition Fee" {...register("name")} />
              </div>
              <div>
                <label htmlFor="fh-desc" className={labelCls}>Description (optional)</label>
                <input id="fh-desc" className="input w-full" {...register("description")} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddHead(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={addHead.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {addHead.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Underline tabs */}
        <div className="flex border-b border-border">
          {(["invoices", "outstanding", "structure"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium transition-colors relative",
                tab === t
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* Invoices */}
        {tab === "invoices" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  placeholder="Search by student name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition bg-card text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["Invoice #", "Student", "Total", "Paid", "Status", "Due Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingInvoices ? (
                    <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-muted-foreground">
                      <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No invoices found</p>
                    </td></tr>
                  ) : invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{inv.student.firstName} {inv.student.lastName}</td>
                      <td className="px-4 py-3 tabular-nums text-foreground">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 tabular-nums text-green-700 dark:text-green-400 font-medium">{formatCurrency(inv.paidAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-md text-xs font-semibold", STATUS_STYLE[inv.status] ?? "bg-muted text-muted-foreground")}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outstanding */}
        {tab === "outstanding" && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Student", "Admission No", "Outstanding", "Overdue Invoices"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingOutstanding ? (
                  <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : outstanding.length === 0 ? (
                  <tr><td colSpan={4} className="py-20 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No outstanding fees</p>
                  </td></tr>
                ) : outstanding.map((item) => (
                  <tr key={item.studentId} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{item.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.admissionNo}</td>
                    <td className="px-4 py-3 text-destructive font-semibold tabular-nums">{formatCurrency(item.outstanding)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-destructive/10 text-destructive">
                        {item.overdueCount} overdue
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fee Structure */}
        {tab === "structure" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowAddHead(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Fee Head
              </button>
            </div>
            <div className="bg-card rounded-xl border border-border divide-y divide-border">
              {feeHeads.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No fee heads configured yet.</p>
                </div>
              ) : feeHeads.map((fh) => (
                <div key={fh.id} className="flex items-center px-5 py-4">
                  <div>
                    <p className="font-medium text-foreground">{fh.name}</p>
                    {fh.description && <p className="text-xs text-muted-foreground mt-0.5">{fh.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
