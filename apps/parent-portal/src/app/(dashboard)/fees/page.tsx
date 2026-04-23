"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CreditCard, Download, CheckCircle2, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import toast from "react-hot-toast";

export default function FeesPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);
  const qc = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["fee-summary", activeChildId],
    queryFn: () => api.get(`/fees/student/${activeChildId}/summary`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const { data: transactions } = useQuery({
    queryKey: ["fee-transactions", activeChildId],
    queryFn: () => api.get(`/fees/student/${activeChildId}/transactions`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const initiatePay = useMutation({
    mutationFn: (feeId: string) =>
      api.post(`/fees/payments/initiate`, { feeId, studentId: activeChildId }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.razorpayOrderId) {
        // In production: open Razorpay checkout with order ID
        toast.success("Razorpay order created: " + data.razorpayOrderId);
      }
    },
    onError: () => toast.error("Payment initiation failed"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Fees</h1>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Due", value: `₹${(summary.totalDue ?? 0).toLocaleString()}`, color: "text-rose-600" },
            { label: "Total Paid", value: `₹${(summary.totalPaid ?? 0).toLocaleString()}`, color: "text-emerald-600" },
            { label: "Overdue", value: `₹${(summary.overdue ?? 0).toLocaleString()}`, color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending fee items */}
      {summary?.pendingItems?.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold text-foreground">Pending Payments</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {summary.pendingItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.feeTypeName}</p>
                  <p className="text-xs text-muted-foreground">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-foreground">₹{item.amount.toLocaleString()}</p>
                  <button
                    onClick={() => initiatePay.mutate(item.id)}
                    disabled={initiatePay.isPending}
                    className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition disabled:opacity-60">
                    <CreditCard className="w-3 h-3" />
                    Pay Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold text-foreground">Payment History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(transactions ?? []).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                {t.status === "SUCCESS"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  : <Clock className="w-4 h-4 text-amber-500" />}
                <div>
                  <p className="text-sm text-foreground">{t.feeTypeName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.paidAt ?? t.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-foreground">₹{t.amount.toLocaleString()}</p>
                {t.receiptUrl && (
                  <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="w-3 h-3" />
                    Receipt
                  </a>
                )}
              </div>
            </div>
          ))}
          {!transactions?.length && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No payment history</p>}
        </div>
      </div>
    </div>
  );
}
