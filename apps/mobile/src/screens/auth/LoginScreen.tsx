import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { authApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin() {
    if (!email || !password) { Alert.alert("Enter email and password"); return; }
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      await setUser(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace(data.user.role === "STUDENT" ? "/(student)/dashboard" : "/(parent)/dashboard");
    } catch {
      Alert.alert("Login failed", "Invalid credentials. Please try again.");
    } finally { setLoading(false); }
  }

  async function handlePhoneLogin() {
    if (!phone || phone.length < 10) { Alert.alert("Enter a valid 10-digit phone number"); return; }
    setLoading(true);
    try {
      await authApi.loginPhone(phone);
      router.push({ pathname: "/auth/otp", params: { phone } });
    } catch {
      Alert.alert("Error", "Could not send OTP. Try again.");
    } finally { setLoading(false); }
  }

  async function handleBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      Alert.alert("Biometrics not available", "Set up fingerprint or Face ID in device settings.");
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to sign in",
      fallbackLabel: "Use passcode",
    });
    if (result.success) {
      // Use stored credentials to refresh session
      try {
        const { data } = await authApi.me();
        router.replace(data.role === "STUDENT" ? "/(student)/dashboard" : "/(parent)/dashboard");
      } catch {
        Alert.alert("Session expired", "Please log in again with email or phone.");
      }
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.title}>School ERP</Text>
          <Text style={styles.subtitle}>Student & Parent Portal</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabs}>
          {(["email", "phone"] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === "email" ? "Email" : "Phone / OTP"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "email" ? (
          <>
            <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" returnKeyType="next" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword}
              secureTextEntry returnKeyType="done" onSubmitEditing={handleEmailLogin} />
            <TouchableOpacity style={styles.btn} onPress={handleEmailLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={styles.input} placeholder="+91 Phone number" value={phone} onChangeText={setPhone}
              keyboardType="phone-pad" maxLength={10} returnKeyType="done" onSubmitEditing={handlePhoneLogin} />
            <TouchableOpacity style={styles.btn} onPress={handlePhoneLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
          <Text style={styles.biometricText}>Use Face ID / Fingerprint</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 28 },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: "#94a3b8", marginTop: 6 },
  tabs: { flexDirection: "row", backgroundColor: "#1e293b", borderRadius: 12, marginBottom: 24, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9 },
  tabActive: { backgroundColor: "#3b82f6" },
  tabText: { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: "#fff" },
  input: { backgroundColor: "#1e293b", color: "#f1f5f9", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: "#334155" },
  btn: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 14 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  biometricBtn: { alignItems: "center", paddingVertical: 12 },
  biometricText: { color: "#60a5fa", fontSize: 14, fontWeight: "600" },
});
