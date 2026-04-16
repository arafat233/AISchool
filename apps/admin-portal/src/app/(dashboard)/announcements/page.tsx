"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Plus, X, Loader2, Megaphone, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface Announcement {
  id: string;
  title: string;
  content: string;
  targetAudience: string;
  createdAt: string;
  sender?: { firstName: string; lastName: string };
}

const schema = z.object({
  title: z.string().min(1, "Required"),
  content: z.string().min(10, "Too short"),
  targetAudience: z.enum(["ALL", "STUDENTS", "PARENTS", "STAFF", "TEACHERS"]),
});
type FormData = z.infer<typeof schema>;

const AUDIENCE_COLOR: Record<string, string> = {
  ALL: "bg-blue-50 text-blue-700",
  STUDENTS: "bg-green-50 text-green-700",
  PARENTS: "bg-purple-50 text-purple-700",
  STAFF: "bg-amber-50 text-amber-700",
  TEACHERS: "bg-teal-50 text-teal-700",
};

export default function AnnouncementsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: () => api.get("/notifications/announcements").then((r) => r.data),
    placeholderData: [],
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { targetAudience: "ALL" },
  });

  const create = useMutation({
    mutationFn: (d: FormData) => api.post("/notifications/announcements", d).then((r) => r.data),
    onSuccess: () => {
      toast.success("Announcement published");
      qc.invalidateQueries({ queryKey: ["announcements"] });
      reset();
      setShowAdd(false);
    },
    onError: () => toast.error("Failed to publish"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/announcements/${id}`).then((r) => r.data),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["announcements"] }); },
  });

  return (
    <>
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold">New Announcement</h2>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => create.mutate(d))} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Title</label>
                <input className="input w-full" placeholder="Annual Sports Day…" {...register("title")} />
                {errors.title && <p className="err">{errors.title.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Target Audience</label>
                <select className="input w-full" {...register("targetAudience")}>
                  <option value="ALL">Everyone</option>
                  <option value="STUDENTS">Students</option>
                  <option value="PARENTS">Parents</option>
                  <option value="TEACHERS">Teachers</option>
                  <option value="STAFF">All Staff</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Content</label>
                <textarea
                  rows={5}
                  className="input w-full resize-none"
                  placeholder="Write your announcement here…"
                  {...register("content")}
                />
                {errors.content && <p className="err">{errors.content.message}</p>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 btn-secondary">Cancel</button>
                <button type="submit" disabled={create.isPending} className="flex-1 btn-primary flex items-center justify-center gap-2">
                  {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-end">
          <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        </div>

        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-xl border border-border py-20 text-center text-muted-foreground">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No announcements yet. Create the first one!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{a.title}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${AUDIENCE_COLOR[a.targetAudience] ?? "bg-gray-100 text-gray-600"}`}>
                        {a.targetAudience}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {a.sender ? `${a.sender.firstName} ${a.sender.lastName}` : "Admin"} · {formatDate(a.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => remove.mutate(a.id)}
                    className="shrink-0 text-gray-300 hover:text-destructive transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
