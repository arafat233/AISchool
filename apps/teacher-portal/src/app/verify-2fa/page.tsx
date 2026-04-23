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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sidebar rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Two-Factor Auth</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter the code from your authenticator app</p>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit((d) => verify.mutate(d))} className="space-y-5">
            <div>
              <label htmlFor="totp-code" className="block text-sm font-medium text-foreground mb-1.5">
                6-Digit Code
              </label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoFocus
                className="input w-full text-xl text-center tracking-widest py-3"
                {...register("totpCode")}
              />
              {errors.totpCode && <p className="err">{errors.totpCode.message}</p>}
            </div>
            <button
              type="submit"
              disabled={verify.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
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
