"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Award, Download, Plus, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";
import toast from "react-hot-toast";
import { format } from "date-fns";

const CERT_TYPES = [
  "BONAFIDE", "CHARACTER", "MIGRATION", "SPORTS",
  "ATTENDANCE", "PARTICIPATION", "CONDUCT", "EXPERIENCE", "RELIEVING",
];

export default function CertificatesPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit, reset } = useForm<any>();

  const { data, isLoading } = useQuery({
    queryKey: ["certificates", activeChildId],
    queryFn: () => api.get(`/certificates/requests?studentId=${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
  });

  const request = useMutation({
    mutationFn: (d: any) =>
      api.post("/certificates/requests", { ...d, studentId: activeChildId }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Certificate request submitted (SLA: 2 working days)");
      qc.invalidateQueries({ queryKey: ["certificates"] });
      setShowForm(false);
      reset();
    },
    onError: () => toast.error("Request failed"),
  });

  const statusIcon = (s: string) => {
    if (s === "ISSUED") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Certificates</h1>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-primary text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition">
          <Plus className="w-4 h-4" />
          Request Certificate
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">New Certificate Request</h2>
          <form onSubmit={handleSubmit((d) => request.mutate(d))} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Certificate Type</label>
              <select className="input w-full" {...register("certificateType", { required: true })}>
                <option value="">Select type…</option>
                {CERT_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Purpose</label>
              <input type="text" className="input w-full" placeholder="e.g. Bank account opening"
                {...register("purpose", { required: true })} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={request.isPending}
                className="btn-primary flex items-center gap-2">
                {request.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Submit Request
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold text-foreground">My Requests</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {(data ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-4">
              {statusIcon(r.status)}
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  {r.certificateType?.charAt(0) + r.certificateType?.slice(1).toLowerCase()} Certificate
                </p>
                <p className="text-xs text-muted-foreground">{r.purpose} · {format(new Date(r.createdAt), "dd MMM yyyy")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "ISSUED"    ? "bg-emerald-50 text-emerald-700" :
                  r.status === "REJECTED"  ? "bg-rose-50 text-rose-700" :
                  "bg-amber-50 text-amber-700"
                }`}>{r.status}</span>
                {r.status === "ISSUED" && r.pdfUrl && (
                  <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                )}
              </div>
            </div>
          ))}
          {!data?.length && <p className="px-5 py-8 text-sm text-muted-foreground text-center">No certificate requests yet</p>}
        </div>
      </div>
    </div>
  );
}
