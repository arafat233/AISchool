/**
 * Unit tests for the Zustand auth store.
 * Mocks expo-secure-store so no native modules required.
 */
import { act } from "react";

// Reset the mock store before each test
import * as SecureStore from "expo-secure-store";
const { __reset } = SecureStore as any;

// Import after mock is set up
let useAuthStore: typeof import("../store/authStore").useAuthStore;

beforeEach(async () => {
  jest.resetModules();
  __reset?.();
  ({ useAuthStore } = await import("../store/authStore"));
});

const mockUser = {
  id: "u1",
  email: "student@school.com",
  role: "STUDENT" as const,
  tenantId: "t1",
  schoolId: "s1",
  name: "Arjun Mehta",
  studentId: "st1",
  classId: "c1",
};

const mockTokens = {
  accessToken: "access_abc",
  refreshToken: "refresh_xyz",
};

describe("authStore", () => {
  describe("initial state", () => {
    it("starts unauthenticated", () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });
  });

  describe("setUser", () => {
    it("sets user and marks authenticated", async () => {
      await act(async () => {
        await useAuthStore.getState().setUser(mockUser, mockTokens);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.name).toBe("Arjun Mehta");
    });

    it("persists tokens to SecureStore", async () => {
      await act(async () => {
        await useAuthStore.getState().setUser(mockUser, mockTokens);
      });

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith("access_token", "access_abc");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith("refresh_token", "refresh_xyz");
    });
  });

  describe("logout", () => {
    it("clears user and sets isAuthenticated false", async () => {
      await act(async () => {
        await useAuthStore.getState().setUser(mockUser, mockTokens);
        await useAuthStore.getState().logout();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it("deletes all tokens from SecureStore", async () => {
      await act(async () => {
        await useAuthStore.getState().setUser(mockUser, mockTokens);
        await useAuthStore.getState().logout();
      });

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("user_data");
    });
  });

  describe("setActiveChild", () => {
    it("updates activeChildId when user is a parent", async () => {
      const parentUser = { ...mockUser, role: "PARENT" as const, parentId: "p1", childrenIds: ["ch1", "ch2"] };
      await act(async () => {
        await useAuthStore.getState().setUser(parentUser, mockTokens);
        useAuthStore.getState().setActiveChild("ch2");
      });

      expect(useAuthStore.getState().user?.activeChildId).toBe("ch2");
    });

    it("does nothing when user is null", () => {
      expect(() => useAuthStore.getState().setActiveChild("ch1")).not.toThrow();
    });
  });

  describe("hydrate", () => {
    it("restores user from SecureStore if tokens exist", async () => {
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify(mockUser))  // user_data
        .mockResolvedValueOnce("access_abc");             // access_token

      await act(async () => {
        await useAuthStore.getState().hydrate();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it("stays unauthenticated if no tokens in store", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await act(async () => {
        await useAuthStore.getState().hydrate();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });
});
