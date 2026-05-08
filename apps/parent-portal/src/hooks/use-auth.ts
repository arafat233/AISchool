import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import toast from "react-hot-toast";

interface LoginPayload { email: string; password: string; totpCode?: string }
interface LoginResponse { accessToken?: string; requiresTwoFactor?: boolean; userId?: string }

function decodeUser(token: string) {
  const payload = JSON.parse(atob(token.split(".")[1]));
  return {
    id: payload.sub as string,
    email: payload.email as string,
    firstName: (payload.email as string)?.split("@")[0] ?? "",
    lastName: "",
    role: payload.role as string,
    tenantId: payload.tenantId as string,
    schoolId: payload.schoolId as string | undefined,
  };
}

export function useLogin() {
  const router = useRouter();
  const { setTokens } = useAuthStore();
  return useMutation({
    mutationFn: (p: LoginPayload) => api.post<LoginResponse>("/auth/login", p).then((r) => r.data),
    onSuccess: (data) => {
      if (data.requiresTwoFactor) { router.push(`/verify-2fa?userId=${data.userId}`); return; }
      if (data.accessToken) {
        const user = decodeUser(data.accessToken);
        setTokens(data.accessToken, user);
        document.cookie = `access_token=${data.accessToken}; path=/; SameSite=Lax`;
        router.push("/dashboard");
      }
    },
    onError: () => toast.error("Invalid credentials"),
  });
}

export function useLogout() {
  const router = useRouter();
  const { logout } = useAuthStore();
  return useMutation({
    mutationFn: () => api.post("/auth/logout").then((r) => r.data),
    onSettled: () => {
      logout();
      document.cookie = "access_token=; path=/; max-age=0";
      router.push("/login");
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
