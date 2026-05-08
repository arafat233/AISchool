"use client";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { UserPlus, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface School { id: string; name: string; code: string; }
interface GradeLevel { id: string; name: string; sections: { id: string; name: string }[]; }

const FUNNEL_DATA = [
  { school: "School A", submitted: 120, shortlisted: 60, enrolled: 48 },
  { school: "School B", submitted: 85, shortlisted: 45, enrolled: 38 },
  { school: "School C", submitted: 200, shortlisted: 100, enrolled: 75 },
];

function EnrollModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (admissionNo: string) => void }) {
  const [schools, setSchools] = useState<School[]>([]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", dob: "",
    schoolId: "", gradeLevelId: "", sectionId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/tenants").then((r) => r.json()).then((data) => setSchools(data ?? []));
  }, []);

  useEffect(() => {
    if (!form.schoolId) { setGradeLevels([]); return; }
    fetch(`/api/admissions/enroll?schoolId=${form.schoolId}`)
      .then((r) => r.json())
      .then((d) => setGradeLevels(d.gradeLevels ?? []));
  }, [form.schoolId]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admissions/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Enrollment failed"); return; }
      onSuccess(data.admissionNo);
    } finally {
      setSubmitting(false);
    }
  }

  const sections = gradeLevels.find((g) => g.id === form.gradeLevelId)?.sections ?? [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border border-border w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Enroll New Student</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={form.firstName} onChange={(v) => set("firstName", v)} required />
            <Field label="Last Name" value={form.lastName} onChange={(v) => set("lastName", v)} required />
          </div>
          <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Date of Birth" type="date" value={form.dob} onChange={(v) => set("dob", v)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">School <span className="text-red-500">*</span></label>
            <select
              value={form.schoolId}
              onChange={(e) => { set("schoolId", e.target.value); set("gradeLevelId", ""); set("sectionId", ""); }}
              required
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select school…</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Grade <span className="text-red-500">*</span></label>
              <select
                value={form.gradeLevelId}
                onChange={(e) => { set("gradeLevelId", e.target.value); set("sectionId", ""); }}
                required
                disabled={!form.schoolId}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Select grade…</option>
                {gradeLevels.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Section <span className="text-red-500">*</span></label>
              <select
                value={form.sectionId}
                onChange={(e) => set("sectionId", e.target.value)}
                required
                disabled={!form.gradeLevelId}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="">Select section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>Section {s.name}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-60 flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              {submitting ? "Enrolling…" : "Enroll Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}

export default function AdmissionsPage() {
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function handleSuccess(admissionNo: string) {
    setShowModal(false);
    setSuccessMsg(`Student enrolled successfully! Admission No: ${admissionNo}`);
    setTimeout(() => setSuccessMsg(""), 6000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admissions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage student enrollment across all schools</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition"
        >
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-foreground mb-4">Applications by Stage — All Schools</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={FUNNEL_DATA} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="school" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="submitted" fill="#3b82f6" name="Submitted" radius={[3, 3, 0, 0]} />
            <Bar dataKey="shortlisted" fill="#8b5cf6" name="Shortlisted" radius={[3, 3, 0, 0]} />
            <Bar dataKey="enrolled" fill="#10b981" name="Enrolled" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["School", "Submitted", "Reviewed", "Shortlisted", "Enrolled", "Conversion %"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {FUNNEL_DATA.map((f) => {
              const conv = Math.round((f.enrolled / f.submitted) * 100);
              return (
                <tr key={f.school} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{f.school}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.submitted}</td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.shortlisted}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.enrolled}</td>
                  <td className="px-4 py-3">
                    <span className={cn("font-semibold", conv >= 40 ? "text-green-600" : "text-orange-500")}>{conv}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && <EnrollModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  );
}
