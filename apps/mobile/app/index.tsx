import { Redirect } from "expo-router";
import { useAuthStore } from "../src/store/authStore";

export default function Index() {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Redirect href="/auth/login" />;
  if (user?.role === "STUDENT") return <Redirect href="/(student)/dashboard" />;
  return <Redirect href="/(parent)/dashboard" />;
}
