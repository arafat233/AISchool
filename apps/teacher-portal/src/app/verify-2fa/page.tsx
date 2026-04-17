"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";

const schema = z.object({ totpCode: z.string().length(6, "Enter 6-digit code") });
type FormData = z.infer<typeof schema>;

export default function Verify2FAPage() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId");
  const { setTokens } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const verify = useMutation({
    mutationFn: (data: FormData) =>
      api.post("/auth/2fa/verify", { userId, totpCode: data.totpCode }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.accessToken && data.user) {
        setTokens(data.accessToken, data.user);
        router.push("/dashboard");
      }
    },
    onError: () => toast.error("Invalid 2FA code"),
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sidebar rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-Factor Auth</h1>
          <p className="text-sm text-gray-500 mt-1">Enter the code from your authenticator app</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit((d) => verify.mutate(d))} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">6-Digit Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoFocus
                className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                {...register("totpCode")}
              />
              {errors.totpCode && <p className="mt-1 text-xs text-destructive">{errors.totpCode.message}</p>}
            </div>
            <button
              type="submit"
              disabled={verify.isPending}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {verify.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Verify
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
