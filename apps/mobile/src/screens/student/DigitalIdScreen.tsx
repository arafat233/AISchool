import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Share, TouchableOpacity, Platform } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { LinearGradient } from "expo-linear-gradient";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface IdCardData {
  studentId: string;
  name: string;
  rollNo: string;
  className: string;
  section: string;
  schoolName: string;
  schoolAddress: string;
  academicYear: string;
  photoUrl?: string;
  bloodGroup?: string;
  parentName: string;
  parentPhone: string;
  validUntil: string;
  qrValue: string; // JSON: { id, name, rollNo, classId, schoolId, timestamp }
}

export default function DigitalIdScreen() {
  const { user } = useAuthStore();
  const [card, setCard] = useState<IdCardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentApi.idCard(user?.studentId ?? "")
      .then((r) => setCard(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function shareId() {
    if (!card) return;
    await Share.share({
      title: `${card.name} — Digital ID`,
      message: `Name: ${card.name}\nRoll No: ${card.rollNo}\nClass: ${card.className} ${card.section}\nSchool: ${card.schoolName}\nValid Until: ${card.validUntil}`,
    });
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  if (!card) return <View style={styles.center}><Text style={{ color: "#64748b" }}>ID card not available.</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Digital ID Card</Text>
      <Text style={styles.subtitle}>Show QR at Gate · Library · Canteen</Text>

      {/* Card */}
      <LinearGradient colors={["#1e3a8a", "#1e40af", "#1d4ed8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* School name */}
        <Text style={styles.schoolName}>{card.schoolName}</Text>
        <Text style={styles.schoolAddress}>{card.schoolAddress}</Text>
        <View style={styles.divider} />

        {/* Student info */}
        <View style={styles.studentRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{card.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.studentName}>{card.name}</Text>
            <Text style={styles.rollNo}>Roll No: {card.rollNo}</Text>
            <Text style={styles.classInfo}>{card.className} — {card.section}</Text>
            <Text style={styles.academicYear}>{card.academicYear}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <QRCode
            value={card.qrValue ?? JSON.stringify({ id: card.studentId, roll: card.rollNo })}
            size={140}
            color="#fff"
            backgroundColor="transparent"
          />
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Blood Group</Text>
            <Text style={styles.footerValue}>{card.bloodGroup ?? "—"}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Parent</Text>
            <Text style={styles.footerValue}>{card.parentName}</Text>
          </View>
          <View style={styles.footerItem}>
            <Text style={styles.footerLabel}>Emergency</Text>
            <Text style={styles.footerValue}>{card.parentPhone}</Text>
          </View>
        </View>
        <Text style={styles.validUntil}>Valid until {card.validUntil}</Text>
      </LinearGradient>

      <TouchableOpacity style={styles.shareBtn} onPress={shareId}>
        <Text style={styles.shareBtnText}>Share ID Card</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>This QR code is scanned at entry gates, library, and canteen for instant verification.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", paddingTop: Platform.OS === "ios" ? 56 : 24, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  pageTitle: { color: "#f1f5f9", fontSize: 22, fontWeight: "800", marginBottom: 4 },
  subtitle: { color: "#64748b", fontSize: 13, marginBottom: 24 },
  card: { width: "100%", borderRadius: 20, padding: 20, elevation: 8, shadowColor: "#3b82f6", shadowOpacity: 0.4, shadowRadius: 20 },
  schoolName: { color: "#fff", fontSize: 16, fontWeight: "800", textAlign: "center" },
  schoolAddress: { color: "#93c5fd", fontSize: 11, textAlign: "center", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 },
  studentRow: { flexDirection: "row", gap: 14, alignItems: "center", marginBottom: 4 },
  avatarPlaceholder: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarInitials: { color: "#fff", fontSize: 22, fontWeight: "800" },
  studentName: { color: "#fff", fontSize: 17, fontWeight: "800" },
  rollNo: { color: "#93c5fd", fontSize: 13, marginTop: 2 },
  classInfo: { color: "#bfdbfe", fontSize: 13, marginTop: 2 },
  academicYear: { color: "#60a5fa", fontSize: 11, marginTop: 2 },
  qrContainer: { alignItems: "center", marginVertical: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  footerItem: { alignItems: "center" },
  footerLabel: { color: "#93c5fd", fontSize: 10, fontWeight: "600" },
  footerValue: { color: "#fff", fontSize: 12, fontWeight: "700", marginTop: 2 },
  validUntil: { color: "rgba(255,255,255,0.5)", fontSize: 10, textAlign: "center", marginTop: 10 },
  shareBtn: { marginTop: 20, backgroundColor: "#1e293b", borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: "#334155" },
  shareBtnText: { color: "#3b82f6", fontWeight: "700", fontSize: 15 },
  hint: { color: "#334155", fontSize: 12, textAlign: "center", marginTop: 16, paddingHorizontal: 20 },
});
