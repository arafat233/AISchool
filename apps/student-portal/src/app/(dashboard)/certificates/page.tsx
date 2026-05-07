"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  Award,
  Download,
  PlusCircle,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth.store";

type CertificateType = "BONAFIDE" | "TC" | "CHARACTER" | "ACHIEVEMENT";
type CertStatus = "AVAILABLE" | "PROCESSING" | "REQUESTED";

interface Certificate {
  id: string;
  type: CertificateType;
  title: string;
  issuedOn?: string;
  status: CertStatus;
  remarks?: string;
}

const CERT_CONFIG: Record<CertificateType, { label: string; description: string; color: string }> = {
  BONAFIDE:    { label: "Bonafide Certificate",    description: "Confirms current enrolment status",          color: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"    },
  TC:          { label: "Transfer Certificate",    description: "Required for school transfer / migration",   color: "text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/20" },
  CHARACTER:   { label: "Character Certificate",   description: "Certifies student conduct and character",    color: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20"  },
  ACHIEVEMENT: { label: "Achievement Certificate", description: "Recognition for academic / co-curricular",  color: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"   },
};

const STATUS_CONFIG: Record<CertStatus, { label: string; icon: React.ElementType; cls: string }> = {
  AVAILABLE:  { label: "Available",  icon: CheckCircle2,   cls: "text-green-700 dark:text-green-400 bg-green-500/10 border-green-500/20"  },
  PROCESSING: { label: "Processing", icon: Clock,          cls: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"   },
  REQUESTED:  { label: "Requested",  icon: FileText,       cls: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/20"       },
};

async function downloadCertificate(certificateId: string, title: string) {
  try {
    const response = await api.get(`/certificates/${certificateId}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error("Failed to download certificate");
  }
}

export default function CertificatesPage() {
  const user = useAuthStore((s) => s.user);
  const studentId = user?.id ?? "";
  const queryClient = useQueryClient();

  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState<{ type: CertificateType; reason: string }>({
    type: "BONAFIDE",
    reason: "",
  });

  const { data: certificates = [], isLoading, isError } = useQuery<Certificate[]>({
    queryKey: ["certificates", studentId],
    queryFn: () => api.get(`/certificates/student/${studentId}`).then((r) => r.data),
    enabled: !!studentId,
    placeholderData: [
      { id: "cert1", type: "BONAFIDE",    title: "Bonafide Certificate",    issuedOn: "2026-04-15", status: "AVAILABLE"  },
      { id: "cert2", type: "CHARACTER",   title: "Character Certificate",   issuedOn: "2026-03-10", status: "AVAILABLE"  },
      { id: "cert3", type: "ACHIEVEMENT", title: "Achievement Certificate", issuedOn: "2026-02-20", status: "AVAILABLE", remarks: "Science Olympiad — 1st Place" },
      { id: "cert4", type: "TC",          title: "Transfer Certificate",                            status: "PROCESSING" },
    ],
  });

  const requestCertificate = useMutation({
    mutationFn: (data: { studentId: string; type: CertificateType; reason: string }) =>
      api.post("/certificates/request", data).then((r) => r.data),
    onSuccess: () => {
      toast.success("Certificate request submitted");
      setShowRequest(false);
      setRequestForm({ type: "BONAFIDE", reason: "" });
      queryClient.invalidateQueries({ queryKey: ["certificates", studentId] });
    },
    onError: () => toast.error("Failed to submit request"),
  });

  const available = certificates.filter((c) => c.status === "AVAILABLE");
  const inProgress = certificates.filter((c) => c.status !== "AVAILABLE");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground gap-3">
        <AlertTriangle className="w-8 h-8 opacity-40" />
        <p className="text-sm">Failed to load certificates</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="bg-card rounded-xl border border-border grid grid-cols-3 divide-x divide-border">
        <div className="p-5 flex items-start gap-3">
          <Award className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Certificates</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{certificates.length}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">Available</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{available.length}</p>
          </div>
        </div>
        <div className="p-5 flex items-start gap-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground font-medium">In Progress</p>
            <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">{inProgress.length}</p>
          </div>
        </div>
      </div>

      {/* Header action */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowRequest(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" />
          Request Certificate
        </button>
      </div>

      {/* Request modal */}
      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Request Certificate</h2>
              <button
                onClick={() => setShowRequest(false)}
                className="text-muted-foreground hover:text-foreground transition focus-visible:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Certificate Type</label>
                <select
                  value={requestForm.type}
                  onChange={(e) => setRequestForm((f) => ({ ...f, type: e.target.value as CertificateType }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {(Object.keys(CERT_CONFIG) as CertificateType[]).map((t) => (
                    <option key={t} value={t}>{CERT_CONFIG[t].label}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">{CERT_CONFIG[requestForm.type].description}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Reason / Purpose</label>
                <textarea
                  rows={3}
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Briefly describe why you need this certificate…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => requestCertificate.mutate({ studentId, type: requestForm.type, reason: requestForm.reason })}
                disabled={requestCertificate.isPending || !requestForm.reason.trim()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {requestCertificate.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                Submit Request
              </button>
              <button onClick={() => setShowRequest(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate list */}
      {certificates.length === 0 ? (
        <div className="bg-card rounded-xl border border-border py-20 flex flex-col items-center text-muted-foreground gap-3">
          <Award className="w-8 h-8 opacity-20" />
          <p className="text-sm">No certificates found</p>
          <button onClick={() => setShowRequest(true)} className="btn-primary flex items-center gap-2 text-xs">
            <PlusCircle className="w-3.5 h-3.5" />
            Request your first certificate
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => {
            const certCfg = CERT_CONFIG[cert.type];
            const statusCfg = STATUS_CONFIG[cert.status];
            const StatusIcon = statusCfg.icon;

            return (
              <div key={cert.id} className="bg-card rounded-xl border border-border px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", certCfg.color)}>
                    <Award className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{certCfg.label}</span>
                      <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border", statusCfg.cls)}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{certCfg.description}</p>
                    {cert.remarks && <p className="text-xs text-muted-foreground italic">"{cert.remarks}"</p>}
                    {cert.issuedOn && (
                      <p className="text-xs text-muted-foreground">Issued on {formatDate(cert.issuedOn)}</p>
                    )}
                  </div>
                </div>
                {cert.status === "AVAILABLE" && (
                  <button
                    onClick={() => downloadCertificate(cert.id, certCfg.label)}
                    className="btn-secondary flex items-center gap-2 text-xs shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
