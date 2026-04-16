"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import toast from "react-hot-toast";
import { Suspense } from "react";

const schema = z.object({ totpCode: z.string().length(6, "Must be 6 digits") });
type FormData = z.infer<typeof schema>;

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId");
  const { setTokens } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const verify = useMutation({
    mutationFn: (d: FormData) =>
      api.post<{ accessToken: string; user: Parameters<typeof setTokens>[1] }>(
        "/auth/2fa/verify",
        { userId, totpCode: d.totpCode }
      ).then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.user);
      router.push("/dashboard");
    },
    onError: () => toast.error("Invalid or expired code"),
  });

  return (
    <form onSubmit={handleSubmit((d) => verify.mutate(d))} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Authenticator code
        </label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          autoFocus
          className="w-full px-3.5 py-3 border border-gray-300 rounded-lg text-lg text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
          {...register("totpCode")}
        />
        {errors.totpCode && (
          <p className="mt-1 text-xs text-destructive text-center">{errors.totpCode.message}</p>
        )}
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
  );
}

export default function Verify2FAPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sidebar rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Two-factor auth</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <Suspense fallback={<div className="h-24 animate-pulse bg-gray-100 rounded-lg" />}>
            <VerifyForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
