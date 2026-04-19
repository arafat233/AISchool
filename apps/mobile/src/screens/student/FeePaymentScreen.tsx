import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Linking,
} from "react-native";
import { studentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Invoice {
  id: string; feeType: string; totalAmtRs: number; paidAmtRs: number;
  dueDate: string; status: "UNPAID" | "PARTIAL" | "PAID"; description: string;
}

export default function FeePaymentScreen() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    studentApi.feeInvoices(user?.studentId ?? "")
      .then((r) => setInvoices(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handlePay(invoice: Invoice) {
    const due = invoice.totalAmtRs - invoice.paidAmtRs;
    Alert.alert(
      "Confirm Payment",
      `Pay ₹${due.toLocaleString("en-IN")} for ${invoice.feeType}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Pay Now", onPress: async () => {
            setPayingId(invoice.id);
            try {
              // Initiate Razorpay payment order
              const { data } = await studentApi.initPayment(invoice.id, due);
              // In production: open Razorpay React Native SDK with data.orderId
              // For now, open payment URL in browser as fallback
              if (data.paymentUrl) {
                await Linking.openURL(data.paymentUrl);
              } else {
                Alert.alert("Payment initiated", `Order ID: ${data.orderId}\nOpen Razorpay to complete payment.`);
              }
              // Refresh invoices after delay
              setTimeout(() => {
                studentApi.feeInvoices(user?.studentId ?? "")
                  .then((r) => setInvoices(r.data)).catch(() => {});
              }, 3000);
            } catch { Alert.alert("Error", "Could not initiate payment. Try again."); }
            finally { setPayingId(null); }
          },
        },
      ],
    );
  }

  const totalOutstanding = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + (i.totalAmtRs - i.paidAmtRs), 0);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Summary banner */}
      <View style={[styles.banner, totalOutstanding > 0 ? styles.bannerDue : styles.bannerClear]}>
        <Text style={styles.bannerLabel}>Total Outstanding</Text>
        <Text style={styles.bannerAmount}>₹{totalOutstanding.toLocaleString("en-IN")}</Text>
        {totalOutstanding === 0 && <Text style={styles.allClearText}>All fees paid! 🎉</Text>}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {invoices.map((inv) => {
          const due = inv.totalAmtRs - inv.paidAmtRs;
          const overdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
          return (
            <View key={inv.id} style={[styles.card, inv.status === "PAID" ? styles.cardPaid : overdue ? styles.cardOverdue : styles.cardDue]}>
              <View style={styles.cardRow}>
                <Text style={styles.feeType}>{inv.feeType}</Text>
                <View style={[styles.statusBadge, { backgroundColor: inv.status === "PAID" ? "#065f46" : overdue ? "#7c1d1d" : "#1e3a8a" }]}>
                  <Text style={styles.statusText}>{inv.status === "PARTIAL" ? "PARTIAL" : inv.status}</Text>
                </View>
              </View>
              <Text style={styles.feeDesc} numberOfLines={1}>{inv.description}</Text>
              <View style={styles.amtRow}>
                <View>
                  <Text style={styles.totalLbl}>Total: ₹{inv.totalAmtRs.toLocaleString("en-IN")}</Text>
                  {inv.paidAmtRs > 0 && <Text style={styles.paidLbl}>Paid: ₹{inv.paidAmtRs.toLocaleString("en-IN")}</Text>}
                </View>
                <Text style={[styles.dueLbl, overdue ? { color: "#fca5a5" } : {}]}>
                  Due: {new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
              </View>
              {inv.status !== "PAID" && (
                <TouchableOpacity style={styles.payBtn} onPress={() => handlePay(inv)} disabled={paying === inv.id}>
                  {paying === inv.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Pay ₹{due.toLocaleString("en-IN")} →</Text>}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  banner: { padding: 24, paddingTop: 56, alignItems: "center" },
  bannerDue: { backgroundColor: "#7c2d12" },
  bannerClear: { backgroundColor: "#064e3b" },
  bannerLabel: { color: "#fca5a5", fontSize: 13, fontWeight: "600" },
  bannerAmount: { color: "#fff", fontSize: 36, fontWeight: "800", marginTop: 4 },
  allClearText: { color: "#6ee7b7", fontSize: 14, marginTop: 4 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  cardPaid: { backgroundColor: "#0f2922", borderLeftColor: "#10b981" },
  cardDue: { backgroundColor: "#1e293b", borderLeftColor: "#3b82f6" },
  cardOverdue: { backgroundColor: "#1c1111", borderLeftColor: "#ef4444" },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  feeType: { color: "#f1f5f9", fontWeight: "700", fontSize: 16 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { color: "#e0f2fe", fontWeight: "700", fontSize: 11 },
  feeDesc: { color: "#64748b", fontSize: 13, marginBottom: 10 },
  amtRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 },
  totalLbl: { color: "#cbd5e1", fontSize: 14, fontWeight: "700" },
  paidLbl: { color: "#10b981", fontSize: 12, marginTop: 2 },
  dueLbl: { color: "#94a3b8", fontSize: 12 },
  payBtn: { backgroundColor: "#3b82f6", borderRadius: 10, padding: 13, alignItems: "center" },
  payBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
