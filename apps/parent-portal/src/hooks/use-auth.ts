"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useChildStore } from "@/store/child.store";

interface LoginPayload {
  email: string;
  password: string;
  totpCode?: string;
}

interface LoginResponse {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatarUrl?: string;
    schoolId?: string;
    tenantId: string;
  };
}

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const { setChildren } = useChildStore();

  return useMutation({
    mutationFn: (data: LoginPayload) =>
      api.post<LoginResponse>("/auth/login", data).then((r) => r.data),
    onSuccess: (data) => {
      if (data.requiresTwoFactor) {
        router.push(`/verify-2fa?userId=${data.userId}`);
        return;
      }
      if (data.accessToken && data.user) {
        setTokens(data.accessToken, data.user);
        // Fetch linked children right after login
        api.get("/students/my-children").then((r) => {
          setChildren(r.data ?? []);
        });
        router.replace("/dashboard");
      }
    },
    onError: () => toast.error("Invalid credentials"),
  });
}

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: () => api.post("/auth/logout").then(() => {}),
    onSettled: () => {
      logout();
      router.replace("/login");
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      api.post("/auth/forgot-password", { email }).then((r) => r.data),
    onSuccess: () => toast.success("Reset link sent to your email"),
    onError: () => toast.error("Failed to send reset link"),
  });
}
