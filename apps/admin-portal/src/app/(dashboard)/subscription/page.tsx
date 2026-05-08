"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  Receipt,
  ChevronDown,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import toast from "react-hot-toast";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tenant {
  id: string;
  name: string;
  plan: string;
  status: string;
  contactEmail: string | null;
  trialEndsAt: string | null;
  activatedAt: string | null;
  createdAt: string;
}

interface BillPreview {
  base: number;
  gst: number;
  total: number;
  studentCount: number;
  plan: string;
  isAnnual: boolean;
}

interface Invoice {
  id: string;
  month: number;
  year: number;
  plan: string;
  studentCount: number;
  baseAmtRs: number;
  gstAmtRs: number;
  totalAmtRs: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string;
  paidAt: string | null;
  txnRef: string | null;
  paymentMethod: string | null;
}

type Tab = "overview" | "invoices" | "upgrade";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  PAID: "bg-green-500/10 text-green-700 dark:text-green-400",
  OVERDUE: "bg-destructive/10 text-destructive font-semibold",
  ACTIVE: "bg-green-500/10 text-green-700",
  TRIAL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  SUSPENDED: "bg-destructive/10 text-destructive",
};

const PLAN_COLOR: Record<string, string> = {
  BASIC: "text-slate-600",
  STANDARD: "text-blue-600",
  PREMIUM: "text-purple-600",
  ENTERPRISE: "text-amber-600",
};

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold", className)}>
      {label}
    </span>
  );
}

// ─── Pay Modal ────────────────────────────────────────────────────────────────

const paySchema = z.object({
  method: z.enum(["NACH", "UPI", "BANK_TRANSFER"]),
  txnRef: z.string().min(4, "Transaction reference required"),
});
type PayForm = z.infer<typeof paySchema>;

function PayModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<PayForm>({
    resolver: zodResolver(paySchema),
    defaultValues: { method: "UPI" },
  });

  const pay = useMutation({
    mutationFn: (d: PayForm) =>
      api
        .post(`/billing/invoices/${invoice.id}/pay`, d)
        .then((r) => r.data),
    onSuccess: () => {
      toast.success("Payment recorded!");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onClose();
    },
    onError: () => toast.error("Payment failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Record Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-muted rounded-xl p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Invoice</span>
            <span className="font-mono font-semibold">{invoice.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Period</span>
            <span>{MONTHS[invoice.month - 1]} {invoice.year}</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-1">
            <span>Total Due</span>
            <span>₹{Number(invoice.totalAmtRs).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit((d) => pay.mutate(d))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Payment Method
            </label>
            <select {...register("method")} className="input w-full">
              <option value="UPI">UPI</option>
              <option value="NACH">NACH</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Transaction Reference
            </label>
            <input
              {...register("txnRef")}
              placeholder="UPI/NEFT/NACH reference"
              className="input w-full"
            />
            {errors.txnRef && (
              <p className="text-xs text-destructive mt-1">{errors.txnRef.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={pay.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pay.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Payment
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

const PLANS = [
  { key: "BASIC", label: "Basic", price: 55, features: ["Attendance", "Fees", "Students", "Notifications"] },
  { key: "STANDARD", label: "Standard", price: 110, features: ["Everything in Basic", "LMS", "Exams", "HR", "Payroll", "Transport"] },
  { key: "PREMIUM", label: "Premium", price: 160, features: ["Everything in Standard", "Library", "Health", "Events", "Expense", "Scholarship", "Certificate"] },
  { key: "ENTERPRISE", label: "Enterprise", price: 200, features: ["All features", "Priority support", "Custom SLA"] },
];

function UpgradeTab({
  tenantId,
  currentPlan,
}: {
  tenantId: string;
  currentPlan: string;
}) {
  const qc = useQueryClient();

  const changePlan = useMutation({
    mutationFn: (plan: string) =>
      api.patch(`/tenants/${tenantId}/plan`, { plan }).then((r) => r.data),
    onSuccess: (_, plan) => {
      toast.success(`Plan changed to ${plan}`);
      qc.invalidateQueries({ queryKey: ["tenant", tenantId] });
      qc.invalidateQueries({ queryKey: ["bill-preview", tenantId] });
    },
    onError: () => toast.error("Failed to change plan"),
  });

  const { data: preview } = useQuery<BillPreview>({
    queryKey: ["bill-preview", tenantId],
    queryFn: () =>
      api.get(`/billing/preview/${tenantId}`).then((r) => r.data),
    enabled: !!tenantId,
  });

  return (
    <div className="space-y-4">
      {preview && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Current monthly estimate</p>
          <p className="text-2xl font-bold">
            ₹{preview.total.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-muted-foreground">
            {preview.studentCount} students × ₹{preview.base / (preview.studentCount || 1)}/student + 18% GST
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div
              key={plan.key}
              className={cn(
                "border rounded-xl p-4 space-y-3 transition-all",
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("font-bold text-sm", PLAN_COLOR[plan.key])}>
                    {plan.label}
                  </p>
                  <p className="text-lg font-bold mt-0.5">
                    ₹{plan.price}
                    <span className="text-xs font-normal text-muted-foreground">
                      /student/mo
                    </span>
                  </p>
                </div>
                {isCurrent && (
                  <Badge label="Current" className="bg-primary/10 text-primary" />
                )}
              </div>

              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && (
                <button
                  onClick={() => changePlan.mutate(plan.key)}
                  disabled={changePlan.isPending}
                  className="w-full text-xs font-semibold bg-primary text-primary-foreground rounded-lg py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-1"
                >
                  {changePlan.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  )}
                  Select {plan.label}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const user = useAuthStore((s) => s.user);
  const tenantId = user?.tenantId ?? "";
  const [tab, setTab] = useState<Tab>("overview");
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  const { data: tenant, isLoading: loadingTenant } = useQuery<Tenant>({
    queryKey: ["tenant", tenantId],
    queryFn: () => api.get(`/tenants/${tenantId}`).then((r) => r.data),
    enabled: !!tenantId,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["invoices"],
    queryFn: () =>
      api.get(`/billing/invoices?tenantId=${tenantId}`).then((r) => r.data),
    enabled: !!tenantId,
  });

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No tenant associated with your account.
      </div>
    );
  }

  if (loadingTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingInvoices = invoices.filter((i) => i.status === "PENDING" || i.status === "OVERDUE");

  return (
    <>
      {payingInvoice && (
        <PayModal invoice={payingInvoice} onClose={() => setPayingInvoice(null)} />
      )}

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your plan, billing, and invoices.
          </p>
        </div>

        {/* Current Plan Card */}
        {tenant && (
          <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  Current Plan
                </p>
                <p className={cn("text-xl font-bold", PLAN_COLOR[tenant.plan] ?? "")}>
                  {tenant.plan}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge
                label={tenant.status}
                className={STATUS_STYLE[tenant.status] ?? "bg-muted text-muted-foreground"}
              />
              {tenant.trialEndsAt && tenant.status === "TRIAL" && (
                <div className="flex items-center gap-1 text-xs text-amber-600">
                  <Clock className="w-3.5 h-3.5" />
                  Trial ends {formatDate(tenant.trialEndsAt)}
                </div>
              )}
              {pendingInvoices.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-destructive font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {(["overview", "invoices", "upgrade"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
                tab === t
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === "overview" && tenant && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Account
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{tenant.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium">{tenant.contactEmail ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium">{formatDate(tenant.createdAt)}</span>
                </div>
                {tenant.activatedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activated</span>
                    <span className="font-medium">{formatDate(tenant.activatedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Billing Summary
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total invoices</span>
                  <span className="font-medium">{invoices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-medium text-green-600">
                    {invoices.filter((i) => i.status === "PAID").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending</span>
                  <span className={cn("font-medium", pendingInvoices.length > 0 ? "text-destructive" : "")}>
                    {pendingInvoices.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "invoices" && (
          <div className="space-y-3">
            {loadingInvoices ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No invoices yet</p>
              </div>
            ) : (
              invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-xs font-semibold">
                        #{inv.id.slice(0, 8).toUpperCase()}
                      </p>
                      <Badge
                        label={inv.status}
                        className={STATUS_STYLE[inv.status] ?? "bg-muted text-muted-foreground"}
                      />
                    </div>
                    <p className="text-sm font-semibold">
                      {MONTHS[inv.month - 1]} {inv.year} — ₹{Number(inv.totalAmtRs).toLocaleString("en-IN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.studentCount} students · {inv.plan} plan
                      {inv.status === "PENDING" && ` · Due ${formatDate(inv.dueDate)}`}
                      {inv.paidAt && ` · Paid ${formatDate(inv.paidAt)}`}
                    </p>
                  </div>

                  {(inv.status === "PENDING" || inv.status === "OVERDUE") && (
                    <button
                      onClick={() => setPayingInvoice(inv)}
                      className="flex-shrink-0 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === "upgrade" && tenant && (
          <UpgradeTab tenantId={tenant.id} currentPlan={tenant.plan} />
        )}
      </div>
    </>
  );
}
