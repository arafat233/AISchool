"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
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

  const STATUS_COLOR: Record<string, string> = {
    PAID: "bg-green-50 text-green-700",
    PARTIAL: "bg-amber-50 text-amber-700",
    UNPAID: "bg-red-50 text-red-700",
    OVERDUE: "bg-red-100 text-red-800",
  };

  return (
    <>
      {showAddHead && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Fee Head</h2>
              <button onClick={() => setShowAddHead(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => addHead.mutate(d))} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Name</label>
                <input className="input w-full" placeholder="Tuition Fee" {...register("name")} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Description (optional)</label>
                <input className="input w-full" {...register("description")} />
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
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(["invoices", "outstanding", "structure"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "structure" ? "Fee Structure" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Invoices */}
        {tab === "invoices" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  placeholder="Search by student name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    {["Invoice #", "Student", "Total", "Paid", "Status", "Due Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingInvoices ? (
                    <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                  ) : invoices.length === 0 ? (
                    <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">
                      <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                      <p>No invoices found</p>
                    </td></tr>
                  ) : invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 font-medium">{inv.student.firstName} {inv.student.lastName}</td>
                      <td className="px-4 py-3">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-green-700">{formatCurrency(inv.paidAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[inv.status] ?? "bg-gray-100 text-gray-600"}`}>
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
          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Student", "Admission No", "Outstanding", "Overdue Invoices"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingOutstanding ? (
                  <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : outstanding.length === 0 ? (
                  <tr><td colSpan={4} className="py-16 text-center text-muted-foreground">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                    <p>No outstanding fees</p>
                  </td></tr>
                ) : outstanding.map((item) => (
                  <tr key={item.studentId} className="border-b border-border/50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium">{item.studentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.admissionNo}</td>
                    <td className="px-4 py-3 text-destructive font-semibold">{formatCurrency(item.outstanding)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
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
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              {feeHeads.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p>No fee heads configured yet.</p>
                </div>
              ) : feeHeads.map((fh) => (
                <div key={fh.id} className="flex items-center px-5 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{fh.name}</p>
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
