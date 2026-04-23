"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Users, Loader2 } from "lucide-react";
import { useLogin } from "@/hooks/use-auth";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPw, setShowPw] = useState(false);
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-sidebar rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AISchool Parent</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to your portal</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="parent@example.com"
                className="input w-full"
                {...register("email")}
              />
              {errors.email && <p className="err">{errors.email.message}</p>}
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input w-full pr-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={showPw ? "Hide password" : "Show password"}
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="err">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {login.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
