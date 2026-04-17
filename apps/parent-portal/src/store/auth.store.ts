import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  schoolId?: string;
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  setAccessToken: (token: string) => void;
  setTokens: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAccessToken: (accessToken) => set({ accessToken }),
      setTokens: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    { name: "parent-auth-storage", partialize: (s) => ({ user: s.user }) }
  )
);
