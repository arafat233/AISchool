"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { FileText, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import toast from "react-hot-toast";

const LEAVE_TYPES = ["CL", "SL", "EL", "Maternity", "Paternity", "Comp-off"] as const;
type LeaveType = (typeof LEAVE_TYPES)[number];

const LEAVE_LABELS: Record<LeaveType, string> = {
  CL: "Casual Leave",
  SL: "Sick Leave",
  EL: "Earned Leave",
  Maternity: "Maternity Leave",
  Paternity: "Paternity Leave",
  "Comp-off": "Compensatory Off",
};

const schema = z
  .object({
    leaveType: z.enum(LEAVE_TYPES),
    fromDate: z.string().min(1, "From date required"),
    toDate: z.string().min(1, "To date required"),
    reason: z.string().min(10, "Please provide a reason (min 10 chars)").max(500),
  })
  .refine((d) => new Date(d.toDate) >= new Date(d.fromDate), {
    message: "End date must be on or after start date",
    path: ["toDate"],
  });

type FormData = z.infer<typeof schema>;

interface LeaveApplication {
  id: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedOn: string;
  approvedBy?: string;
  remarks?: string;
}

interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  balance: number;
}

const STATUS_CONFIG = {
  PENDING: { label: "Pending", icon: Clock, color: "text-amber-700 bg-amber-50 border-amber-200" },
  APPROVED: { label: "Approved", icon: CheckCircle2, color: "text-green-700 bg-green-50 border-green-200" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "text-red-700 bg-red-50 border-red-200" },
};

export default function LeavePage() {
  const [view, setView] = useState<"apply" | "history">("apply");
  const qc = useQueryClient();

  const { data: balances = [] } = useQuery<LeaveBalance[]>({
    queryKey: ["leave-balances"],
    queryFn: () => api.get("/hr/leave/balance").then((r) => r.data),
    placeholderData: [
      { type: "CL", total: 12, used: 3, balance: 9 },
      { type: "SL", total: 10, used: 1, balance: 9 },
      { type: "EL", total: 15, used: 5, balance: 10 },
      { type: "Comp-off", total: 2, used: 0, balance: 2 },
    ],
  });

  const { data: history = [] } = useQuery<LeaveApplication[]>({
    queryKey: ["leave-history"],
    queryFn: () => api.get("/hr/leave/my-applications").then((r) => r.data),
    placeholderData: [
      {
        id: "la1",
        leaveType: "CL",
        fromDate: "2026-04-10",
        toDate: "2026-04-11",
        days: 2,
        reason: "Personal work",
        status: "APPROVED",
        appliedOn: "2026-04-08",
        approvedBy: "Principal",
      },
      {
        id: "la2",
        leaveType: "SL",
        fromDate: "2026-03-20",
        toDate: "2026-03-20",
        days: 1,
        reason: "Fever",
        status: "APPROVED",
        appliedOn: "2026-03-20",
      },
    ],
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { leaveType: "CL" },
  });

  const fromDate = watch("fromDate");
  const toDate = watch("toDate");

  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const diff = Math.ceil(
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    return Math.max(0, diff);
  };

  const apply = useMutation({
    mutationFn: (data: FormData) => api.post("/hr/leave/apply", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Leave application submitted!");
      reset();
      qc.invalidateQueries({ queryKey: ["leave-history"] });
      qc.invalidateQueries({ queryKey: ["leave-balances"] });
      qc.invalidateQueries({ queryKey: ["teacher-dashboard"] });
      setView("history");
    },
    onError: () => toast.error("Failed to submit application"),
  });

  return (
    <div className="space-y-4">
      {/* Leave balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {balances.map((b) => (
          <div key={b.type} className="bg-white rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground font-medium">{LEAVE_LABELS[b.type]}</p>
            <div className="flex items-end gap-1 mt-1">
              <span className="text-2xl font-bold text-gray-900">{b.balance}</span>
              <span className="text-xs text-muted-foreground mb-0.5">/ {b.total}</span>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-sidebar"
                style={{ width: `${(b.balance / b.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">{b.used} used</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(["apply", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition ${
              view === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "apply" ? "Apply Leave" : "My Applications"}
          </button>
        ))}
      </div>

      {/* Apply form */}
      {view === "apply" && (
        <div className="bg-white rounded-xl border border-border p-6 max-w-xl">
          <div className="flex items-center gap-2 mb-5">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">New Leave Application</h3>
          </div>

          <form onSubmit={handleSubmit((d) => apply.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Leave Type</label>
              <select {...register("leaveType")} className="input w-full">
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LEAVE_LABELS[t]} ({t})
                  </option>
                ))}
              </select>
              {errors.leaveType && <p className="err">{errors.leaveType.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">From Date</label>
                <input
                  type="date"
                  {...register("fromDate")}
                  min={new Date().toISOString().split("T")[0]}
                  className="input w-full"
                />
                {errors.fromDate && <p className="err">{errors.fromDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">To Date</label>
                <input
                  type="date"
                  {...register("toDate")}
                  min={fromDate || new Date().toISOString().split("T")[0]}
                  className="input w-full"
                />
                {errors.toDate && <p className="err">{errors.toDate.message}</p>}
              </div>
            </div>

            {fromDate && toDate && calculateDays() > 0 && (
              <div className="text-sm text-muted-foreground bg-gray-50 px-3 py-2 rounded-lg border border-border">
                Duration: <span className="font-semibold text-gray-900">{calculateDays()} day(s)</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason</label>
              <textarea
                {...register("reason")}
                rows={3}
                placeholder="Briefly describe the reason for leave..."
                className="input w-full resize-none"
              />
              {errors.reason && <p className="err">{errors.reason.message}</p>}
            </div>

            <button
              type="submit"
              disabled={apply.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {apply.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </form>
        </div>
      )}

      {/* History */}
      {view === "history" && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          {history.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-3 text-gray-200" />
              <p>No leave applications yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  {["Type", "From", "To", "Days", "Applied On", "Status", "Remarks"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((app) => {
                  const cfg = STATUS_CONFIG[app.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <tr key={app.id} className="border-b border-border/50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{app.leaveType}</span>
                        <p className="text-xs text-muted-foreground">{app.reason.slice(0, 30)}…</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(app.fromDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(app.toDate)}</td>
                      <td className="px-4 py-3 font-semibold">{app.days}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(app.appliedOn)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {app.remarks ?? app.approvedBy ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
