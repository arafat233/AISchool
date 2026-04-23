"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, ClipboardList, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

export default function SurveysPage() {
  const user = useAuthStore((s) => s.user);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const { data: surveys, isLoading } = useQuery({
    queryKey: ["surveys"],
    queryFn: () => api.get("/surveys").then((r) => r.data),
  });

  const { data: surveyDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["survey-detail", activeSurvey?.id],
    queryFn: () => api.get(`/surveys/${activeSurvey?.id}`).then((r) => r.data),
    enabled: !!activeSurvey?.id,
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/surveys/${activeSurvey?.id}/respond`, { answers }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Response submitted!");
      setActiveSurvey(null);
      setAnswers({});
    },
    onError: () => toast.error("Submission failed"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (activeSurvey) {
    if (loadingDetail) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => setActiveSurvey(null)} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
          <h1 className="text-xl font-bold text-foreground">{surveyDetail?.title}</h1>
        </div>
        {surveyDetail?.description && <p className="text-sm text-muted-foreground">{surveyDetail.description}</p>}

        <div className="space-y-5">
          {(surveyDetail?.questions ?? []).map((q: any, i: number) => (
            <div key={q.id} className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-foreground mb-3">{i + 1}. {q.questionText}</p>
              {(q.questionType === "RATING" || q.questionType === "NPS") && (
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: q.questionType === "NPS" ? 10 : (q.maxValue ?? 5) }, (_, i) => i + (q.minValue ?? 1)).map((n) => (
                    <button key={n} onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                      className={`w-10 h-10 rounded-lg border text-sm font-semibold transition ${answers[q.id] === n ? "bg-primary text-white border-primary" : "border-border hover:border-primary text-foreground"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {q.questionType === "MCQ" && (
                <div className="space-y-2">
                  {(q.options?.options ?? []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name={q.id} value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="text-primary" />
                      <span className="text-sm text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === "CHECKBOX" && (
                <div className="space-y-2">
                  {(q.options?.options ?? []).map((opt: string) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" value={opt}
                        checked={(answers[q.id] ?? []).includes(opt)}
                        onChange={(e) => {
                          const prev: string[] = answers[q.id] ?? [];
                          setAnswers((a) => ({
                            ...a,
                            [q.id]: e.target.checked ? [...prev, opt] : prev.filter((v) => v !== opt),
                          }));
                        }}
                        className="text-primary" />
                      <span className="text-sm text-foreground">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.questionType === "TEXT" && (
                <textarea rows={3} className="input w-full resize-none"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
              )}
            </div>
          ))}
        </div>

        <button onClick={() => submit.mutate()} disabled={submit.isPending}
          className="btn-primary flex items-center gap-2">
          {submit.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Submit Response
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Surveys</h1>
      <div className="space-y-3">
        {(surveys ?? []).map((s: any) => (
          <div key={s.id} className="bg-card rounded-xl border border-border p-5 flex items-start justify-between">
            <div className="flex items-start gap-3">
              <ClipboardList className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">{s._count?.questions ?? 0} questions · {s._count?.responses ?? 0} responses</p>
              </div>
            </div>
            <button onClick={() => setActiveSurvey(s)}
              className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition shrink-0">
              Take Survey
            </button>
          </div>
        ))}
        {!surveys?.length && <p className="text-sm text-muted-foreground text-center py-12">No surveys available</p>}
      </div>
    </div>
  );
}
