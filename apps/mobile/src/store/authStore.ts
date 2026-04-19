import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

export type UserRole = "STUDENT" | "PARENT";

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role: UserRole;
  tenantId: string;
  schoolId: string;
  name: string;
  photoUrl?: string;
  // Student-specific
  studentId?: string;
  classId?: string;
  rollNo?: string;
  // Parent-specific
  parentId?: string;
  childrenIds?: string[];
  activeChildId?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser, tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  setActiveChild: (childId: string) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: async (user, tokens) => {
    await SecureStore.setItemAsync("access_token", tokens.accessToken);
    await SecureStore.setItemAsync("refresh_token", tokens.refreshToken);
    await SecureStore.setItemAsync("user_data", JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    await SecureStore.deleteItemAsync("user_data");
    set({ user: null, isAuthenticated: false });
  },

  setActiveChild: (childId) => {
    const { user } = get();
    if (user) set({ user: { ...user, activeChildId: childId } });
  },

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync("user_data");
      const token = await SecureStore.getItemAsync("access_token");
      if (raw && token) {
        set({ user: JSON.parse(raw), isAuthenticated: true });
      }
    } finally {
      set({ isLoading: false });
    }
  },
}));
