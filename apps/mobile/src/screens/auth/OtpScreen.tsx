import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { authApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<TextInput[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleChange(value: string, idx: number) {
    const next = [...otp];
    next[idx] = value.replace(/\D/, "").slice(-1);
    setOtp(next);
    if (value && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  }

  function handleBackspace(idx: number) {
    if (!otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
      const next = [...otp]; next[idx - 1] = "";
      setOtp(next);
    }
  }

  async function handleVerify() {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { Alert.alert("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp(phone, code);
      await setUser(data.user, { accessToken: data.accessToken, refreshToken: data.refreshToken });
      router.replace(data.user.role === "STUDENT" ? "/(student)/dashboard" : "/(parent)/dashboard");
    } catch {
      Alert.alert("Invalid OTP", "The code is incorrect or has expired.");
      setOtp(Array(OTP_LENGTH).fill(""));
      inputs.current[0]?.focus();
    } finally { setLoading(false); }
  }

  async function handleResend() {
    await authApi.loginPhone(phone);
    setResendTimer(30);
    setOtp(Array(OTP_LENGTH).fill(""));
    inputs.current[0]?.focus();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Verify OTP</Text>
      <Text style={styles.subtitle}>Sent to +91 {phone}</Text>

      <View style={styles.otpRow}>
        {otp.map((val, idx) => (
          <TextInput
            key={idx}
            ref={(el) => { if (el) inputs.current[idx] = el; }}
            style={[styles.otpBox, val ? styles.otpBoxFilled : undefined]}
            value={val}
            onChangeText={(v) => handleChange(v, idx)}
            onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === "Backspace") handleBackspace(idx); }}
            keyboardType="numeric"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify & Sign In</Text>}
      </TouchableOpacity>

      <TouchableOpacity disabled={resendTimer > 0} onPress={handleResend} style={styles.resend}>
        <Text style={[styles.resendText, resendTimer > 0 && { color: "#64748b" }]}>
          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 28, paddingTop: 60 },
  back: { marginBottom: 40 },
  backText: { color: "#60a5fa", fontSize: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#94a3b8", marginBottom: 40 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  otpBox: { width: 50, height: 58, borderRadius: 12, borderWidth: 2, borderColor: "#334155", backgroundColor: "#1e293b", textAlign: "center", fontSize: 22, fontWeight: "700", color: "#fff" },
  otpBoxFilled: { borderColor: "#3b82f6" },
  btn: { backgroundColor: "#3b82f6", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 20 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  resend: { alignItems: "center" },
  resendText: { color: "#60a5fa", fontSize: 14, fontWeight: "600" },
});
