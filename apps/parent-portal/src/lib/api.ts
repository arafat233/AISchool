import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth.store";

export const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || orig._retry) return Promise.reject(error);
    if (isRefreshing) {
      return new Promise((res, rej) => queue.push({ resolve: res, reject: rej })).then((t) => {
        orig.headers.Authorization = `Bearer ${t}`;
        return api(orig);
      });
    }
    orig._retry = true;
    isRefreshing = true;
    try {
      const { data } = await axios.post<{ accessToken: string }>("/api/auth/refresh", {}, { withCredentials: true });
      useAuthStore.getState().setAccessToken(data.accessToken);
      queue.forEach((p) => p.resolve(data.accessToken));
      queue = [];
      orig.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(orig);
    } catch (e) {
      queue.forEach((p) => p.reject(e));
      queue = [];
      useAuthStore.getState().logout();
      window.location.href = "/login";
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);
