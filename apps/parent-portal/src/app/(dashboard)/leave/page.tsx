"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import toast from "react-hot-toast";
import { format } from "date-fns";

export default function LeavePage() {
  const activeChildId = useChildStore((s) => s.activeChildId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<any>();

  const { data, isLoading } = useQuery({
    queryKey: ["leave-applications", activeChildId],
    queryFn: () => api.get(`/students/${activeChildId}/leave-applications`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const apply = useMutation({
    mutationFn: (d: any) => api.post(`/students/${activeChildId}/leave-applications`, d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Leave application submitted");
      qc.invalidateQueries({ queryKey: ["leave-applications"] });
      setShowForm(false);
      reset();
    },
    onError: () => toast.error("Failed to submit"),
  });

  const gatePassMutation = useMutation({
    mutationFn: (d: any) => api.post(`/students/${activeChildId}/gate-passes`, d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Gate pass request submitted");
      qc.invalidateQueries({ queryKey: ["leave-applications"] });
    },
    onError: () => toast.error("Failed to request gate pass"),
  });

  const statusIcon = (s: string) => {
    if (s === "APPROVED") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "REJECTED") return <XCircle className="w-4 h-4 text-rose-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Leave & Gate Pass</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition">
          <Plus className="w-4 h-4" />
          Apply Leave
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">New Leave Application</h2>
          <form onSubmit={handleSubmit((d) => apply.mutate(d))} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
              <input type="date" className="input w-full" {...register("fromDate", { required: true })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
              <input type="date" className="input w-full" {...register("toDate", { required: true })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <textarea rows={3} className="input w-full resize-none" {...register("reason", { required: true })} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" disabled={apply.isPending}
                className="btn-primary flex items-center gap-2">
                {apply.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Submit
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Leave Applications</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(data ?? []).map((l: any) => (
            <div key={l.id} className="flex items-center gap-3 px-5 py-3">
              {statusIcon(l.status)}
              <div className="flex-1">
                <p className="text-sm text-gray-800">{l.reason}</p>
                <p className="text-xs text-gray-500">
                  {format(new Date(l.fromDate), "dd MMM")} – {format(new Date(l.toDate), "dd MMM yyyy")}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                l.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                l.status === "REJECTED" ? "bg-rose-50 text-rose-700" :
                "bg-amber-50 text-amber-700"
              }`}>{l.status}</span>
            </div>
          ))}
          {!data?.length && <p className="px-5 py-8 text-sm text-gray-400 text-center">No applications yet</p>}
        </div>
      </div>
    </div>
  );
}
