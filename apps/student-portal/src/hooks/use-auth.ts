import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface LoginPayload { email: string; password: string; totpCode?: string }
interface LoginResponse {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  userId?: string;
  user?: { id: string; email: string; firstName: string; lastName: string; role: string; avatarUrl?: string; schoolId?: string; tenantId: string };
}

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  return useMutation({
    mutationFn: (p: LoginPayload) => api.post<LoginResponse>("/auth/login", p).then((r) => r.data),
    onSuccess: (data) => {
      if (data.requiresTwoFactor) { router.push(`/verify-2fa?userId=${data.userId}`); return; }
      if (data.accessToken && data.user) { setTokens(data.accessToken, data.user); router.push("/dashboard"); }
    },
    onError: () => toast.error("Invalid credentials"),
  });
}

export function useLogout() {
  const router = useRouter();
  const { logout } = useAuthStore();
  return useMutation({
    mutationFn: () => api.post("/auth/logout").then((r) => r.data),
    onSettled: () => { logout(); router.push("/login"); },
  });
}
