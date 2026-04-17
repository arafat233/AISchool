"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Download,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";

type InvoiceStatus = "PENDING" | "PARTIAL" | "PAID" | "OVERDUE";

interface FeeInvoice {
  id: string;
  invoiceNo: string;
  title: string;
  term: string;
  academicYear: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: InvoiceStatus;
  items: { description: string; amount: number }[];
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  mode: string;
  receiptNo: string;
  invoiceTitle: string;
}

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  PAID:    { label: "Paid",    color: "text-green-700 bg-green-50 border-green-200",  icon: CheckCircle2  },
  PENDING: { label: "Pending", color: "text-amber-700 bg-amber-50 border-amber-200",  icon: Clock         },
  PARTIAL: { label: "Partial", color: "text-blue-700 bg-blue-50 border-blue-200",     icon: Clock         },
  OVERDUE: { label: "Overdue", color: "text-red-700 bg-red-50 border-red-200",        icon: AlertTriangle },
};

export default function FeesPage() {
  const [tab, setTab] = useState<"invoices" | "history">("invoices");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: invoices = [] } = useQuery<FeeInvoice[]>({
    queryKey: ["student-invoices"],
    queryFn: () => api.get("/fee/student/invoices").then((r) => r.data),
    placeholderData: [
      {
        id: "inv1",
        invoiceNo: "INV-2026-001",
        title: "Term 1 Fees — 2025-26",
        term: "Term 1",
        academicYear: "2025-26",
        dueDate: "2026-04-30",
        totalAmount: 4500000,
        paidAmount: 4500000,
        balanceAmount: 0,
        status: "PAID",
        items: [
          { description: "Tuition Fee", amount: 3500000 },
          { description: "Sports Fee", amount: 500000 },
          { description: "Lab Fee", amount: 300000 },
          { description: "Library Fee", amount: 200000 },
        ],
      },
      {
        id: "inv2",
        invoiceNo: "INV-2026-002",
        title: "Term 2 Fees — 2025-26",
        term: "Term 2",
        academicYear: "2025-26",
        dueDate: "2026-05-15",
        totalAmount: 4200000,
        paidAmount: 2000000,
        balanceAmount: 2200000,
        status: "PARTIAL",
        items: [
          { description: "Tuition Fee", amount: 3500000 },
          { description: "Sports Fee", amount: 500000 },
          { description: "Activity Fee", amount: 200000 },
        ],
      },
      {
        id: "inv3",
        invoiceNo: "INV-2026-003",
        title: "Annual Day & Excursion",
        term: "Annual",
        academicYear: "2025-26",
        dueDate: "2026-04-20",
        totalAmount: 150000,
        paidAmount: 0,
        balanceAmount: 150000,
        status: "OVERDUE",
        items: [
          { description: "Annual Day Contribution", amount: 100000 },
          { description: "Excursion Fee", amount: 50000 },
        ],
      },
    ],
  });

  const { data: history = [] } = useQuery<PaymentHistory[]>({
    queryKey: ["student-payment-history"],
    queryFn: () => api.get("/fee/student/payments").then((r) => r.data),
    placeholderData: [
      { id: "p1", date: "2026-04-01", amount: 4500000, mode: "UPI", receiptNo: "RCP-001", invoiceTitle: "Term 1 Fees" },
      { id: "p2", date: "2026-04-10", amount: 2000000, mode: "Online", receiptNo: "RCP-002", invoiceTitle: "Term 2 Fees" },
    ],
  });

  const initiatePayment = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post("/fee/razorpay/order", { invoiceId }).then((r) => r.data),
    onSuccess: (data: { orderId: string; amount: number; currency: string; key: string; invoiceId: string }) => {
      // Load Razorpay checkout
      if (typeof window === "undefined") return;
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "AISchool",
          description: "Fee Payment",
          order_id: data.orderId,
          handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
            try {
              await api.post("/fee/razorpay/verify", {
                invoiceId: data.invoiceId,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
              toast.success("Payment successful!");
            } catch {
              toast.error("Payment verification failed");
            }
          },
          theme: { color: "#6d28d9" },
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (window as any).Razorpay(options).open();
      };
      document.body.appendChild(script);
    },
    onError: () => toast.error("Failed to initiate payment"),
  });

  const totalOutstanding = invoices
    .filter((i) => i.status !== "PAID")
    .reduce((s, i) => s + i.balanceAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Overdue</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {invoices.filter((i) => i.status === "OVERDUE").length} invoice(s)
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Paid This Year</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {formatCurrency(invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.totalAmount, 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["invoices", "history"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "invoices" ? "Invoices" : "Payment History"}
          </button>
        ))}
      </div>

      {/* Invoices list */}
      {tab === "invoices" && (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const cfg = STATUS_CONFIG[inv.status];
            const StatusIcon = cfg.icon;
            const isExpanded = expanded === inv.id;
            const paidPct = inv.totalAmount > 0 ? (inv.paidAmount / inv.totalAmount) * 100 : 0;

            return (
              <div key={inv.id} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <button
                  className="w-full flex items-start gap-4 px-5 py-4 hover:bg-gray-50/50 transition text-left"
                  onClick={() => setExpanded(isExpanded ? null : inv.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{inv.title}</span>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                        cfg.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.invoiceNo} · Due {formatDate(inv.dueDate)}
                    </p>
                    {/* Progress bar */}
                    {inv.status !== "PAID" && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${paidPct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{paidPct.toFixed(0)}% paid</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                    {inv.balanceAmount > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">
                        Balance: {formatCurrency(inv.balanceAmount)}
                      </p>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 space-y-4">
                    {/* Line items */}
                    <div className="space-y-1.5">
                      {inv.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.description}</span>
                          <span className="font-medium">{formatCurrency(item.amount)}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{formatCurrency(inv.totalAmount)}</span>
                      </div>
                      {inv.paidAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-700">
                          <span>Paid</span>
                          <span>− {formatCurrency(inv.paidAmount)}</span>
                        </div>
                      )}
                      {inv.balanceAmount > 0 && (
                        <div className="flex justify-between text-sm font-bold text-red-700">
                          <span>Balance Due</span>
                          <span>{formatCurrency(inv.balanceAmount)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {inv.balanceAmount > 0 && (
                        <button
                          onClick={() => initiatePayment.mutate(inv.id)}
                          disabled={initiatePayment.isPending}
                          className="btn-primary flex items-center gap-2"
                        >
                          {initiatePayment.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          Pay {formatCurrency(inv.balanceAmount)} via Razorpay
                        </button>
                      )}
                      <button className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Download Receipt
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment history */}
      {tab === "history" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {history.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <CreditCard className="w-8 h-8 mx-auto mb-3 text-gray-200" />
              No payments yet
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Receipt No", "Invoice", "Date", "Mode", "Amount"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.receiptNo}</td>
                    <td className="px-4 py-3 font-medium">{p.invoiceTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium bg-gray-100 px-2 py-0.5 rounded-full">{p.mode}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
