import axios from "axios";
import * as SecureStore from "expo-secure-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";

export const api = axios.create({ baseURL: BASE_URL, timeout: 15_000 });

// Inject auth token on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await SecureStore.getItemAsync("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: refresh });
          await SecureStore.setItemAsync("access_token", data.accessToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(error.config);
        } catch {
          await SecureStore.deleteItemAsync("access_token");
          await SecureStore.deleteItemAsync("refresh_token");
        }
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth endpoints ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  loginPhone: (phone: string) =>
    api.post("/auth/otp/send", { phone }),
  verifyOtp: (phone: string, otp: string) =>
    api.post("/auth/otp/verify", { phone, otp }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
};

// ─── Student endpoints ───────────────────────────────────────────────────────
export const studentApi = {
  dashboard: (studentId: string) =>
    api.get(`/students/${studentId}/dashboard`),
  timetable: (classId: string) =>
    api.get(`/academic/timetable/${classId}`),
  attendance: (studentId: string, from: string, to: string) =>
    api.get(`/attendance/student/${studentId}`, { params: { from, to } }),
  applyLeave: (data: object) =>
    api.post("/attendance/leave", data),
  assignments: (studentId: string) =>
    api.get(`/lms/assignments/${studentId}`),
  submitAssignment: (assignmentId: string, data: FormData) =>
    api.post(`/lms/assignments/${assignmentId}/submit`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  feeInvoices: (studentId: string) =>
    api.get(`/fees/invoices/student/${studentId}`),
  initPayment: (invoiceId: string, amount: number) =>
    api.post("/fees/payment/init", { invoiceId, amount }),
  courses: (studentId: string) =>
    api.get(`/lms/enrollments/${studentId}`),
  markLesson: (lessonId: string) =>
    api.post(`/lms/lessons/${lessonId}/complete`),
  quizzes: (studentId: string) =>
    api.get(`/lms/quizzes/student/${studentId}`),
  submitQuiz: (quizId: string, answers: object) =>
    api.post(`/lms/quizzes/${quizId}/submit`, { answers }),
  idCard: (studentId: string) =>
    api.get(`/students/${studentId}/id-card`),
  examResults: (studentId: string) =>
    api.get(`/exams/results/student/${studentId}`),
  notifications: () =>
    api.get("/notifications/my"),
};

// ─── Parent endpoints ────────────────────────────────────────────────────────
export const parentApi = {
  children: (parentId: string) =>
    api.get(`/students/parent/${parentId}`),
  childDashboard: (studentId: string) =>
    api.get(`/students/${studentId}/dashboard`),
  busLocation: (vehicleId: string) =>
    api.get(`/transport/vehicle/${vehicleId}/location`),
  busRoute: (routeId: string) =>
    api.get(`/transport/routes/${routeId}`),
  walletBalance: (parentId: string) =>
    api.get(`/fees/wallet/${parentId}`),
  topUpWallet: (amount: number, method: string) =>
    api.post("/fees/wallet/topup", { amount, method }),
  notifPrefs: (userId: string) =>
    api.get(`/notifications/preferences/${userId}`),
  updateNotifPrefs: (userId: string, prefs: object) =>
    api.put(`/notifications/preferences/${userId}`, prefs),
};
