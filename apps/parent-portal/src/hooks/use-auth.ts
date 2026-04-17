"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { useChildStore } from "@/store/child.store";

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  const { setChildren } = useChildStore();

  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      api.post("/auth/login", data).then((r) => r.data),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.user);
      // Fetch linked children right after login
      api.get("/students/my-children").then((r) => {
        setChildren(r.data ?? []);
      });
      router.replace("/dashboard");
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
