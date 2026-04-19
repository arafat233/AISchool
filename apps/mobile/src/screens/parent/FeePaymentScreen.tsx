import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, ActivityIndicator,
} from "react-native";
import { studentApi, parentApi } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Invoice { id: string; feeType: string; totalAmtRs: number; paidAmtRs: number; dueDate: string; status: string; }

export default function ParentFeeScreen() {
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallet, setWallet] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmt, setTopupAmt] = useState("");
  const [topupMethod, setTopupMethod] = useState("UPI");
  const [submitting, setSubmitting] = useState(false);

  const activeChildId = user?.activeChildId ?? user?.childrenIds?.[0] ?? "";

  useEffect(() => {
    Promise.all([
      studentApi.feeInvoices(activeChildId),
      parentApi.walletBalance(user?.parentId ?? ""),
    ]).then(([inv, w]) => { setInvoices(inv.data); setWallet(Number(w.data.balanceRs ?? 0)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleTopup() {
    const amt = Number(topupAmt);
    if (!amt || amt < 100) { Alert.alert("Minimum top-up is ₹100"); return; }
    setSubmitting(true);
    try {
      await parentApi.topUpWallet(amt, topupMethod);
      setWallet((w) => w + amt);
      setTopupModal(false);
      setTopupAmt("");
      Alert.alert("Success", `₹${amt} added to wallet`);
    } catch { Alert.alert("Error", "Top-up failed. Try again."); }
    finally { setSubmitting(false); }
  }

  async function payFromWallet(invoice: Invoice) {
    const due = invoice.totalAmtRs - invoice.paidAmtRs;
    if (wallet < due) { Alert.alert("Insufficient wallet balance", `Add ₹${due - wallet} more to wallet.`); return; }
    Alert.alert("Pay from Wallet", `Pay ₹${due.toLocaleString("en-IN")} for ${invoice.feeType}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Pay", onPress: async () => {
          try {
            await studentApi.initPayment(invoice.id, due);
            setWallet((w) => w - due);
            setInvoices((prev) => prev.map((i) => i.id === invoice.id ? { ...i, status: "PAID", paidAmtRs: i.totalAmtRs } : i));
            Alert.alert("Paid!", "Fee paid successfully from wallet.");
          } catch { Alert.alert("Error", "Payment failed."); }
        },
      },
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#3b82f6" size="large" /></View>;

  const totalDue = invoices.filter((i) => i.status !== "PAID").reduce((s, i) => s + (i.totalAmtRs - i.paidAmtRs), 0);

  return (
    <View style={styles.container}>
      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Wallet Balance</Text>
        <Text style={styles.walletAmt}>₹{wallet.toLocaleString("en-IN")}</Text>
        <TouchableOpacity style={styles.topupBtn} onPress={() => setTopupModal(true)}>
          <Text style={styles.topupBtnText}>+ Top Up</Text>
        </TouchableOpacity>
      </View>

      {totalDue > 0 && (
        <View style={styles.dueBanner}>
          <Text style={styles.dueBannerText}>Total Outstanding: ₹{totalDue.toLocaleString("en-IN")}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {invoices.map((inv) => {
          const due = inv.totalAmtRs - inv.paidAmtRs;
          return (
            <View key={inv.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.feeType}>{inv.feeType}</Text>
                <Text style={[styles.status, inv.status === "PAID" ? { color: "#10b981" } : { color: "#f59e0b" }]}>{inv.status}</Text>
              </View>
              <Text style={styles.amount}>₹{inv.totalAmtRs.toLocaleString("en-IN")}</Text>
              <Text style={styles.dueDate}>Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}</Text>
              {inv.status !== "PAID" && (
                <TouchableOpacity style={styles.payBtn} onPress={() => payFromWallet(inv)}>
                  <Text style={styles.payBtnText}>Pay ₹{due.toLocaleString("en-IN")} from Wallet</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Top-up Modal */}
      <Modal visible={topupModal} transparent animationType="slide" onRequestClose={() => setTopupModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Top Up Wallet</Text>
            <TextInput style={styles.input} placeholder="Amount (₹)" placeholderTextColor="#475569" value={topupAmt}
              onChangeText={setTopupAmt} keyboardType="numeric" />
            <View style={styles.methodRow}>
              {["UPI", "CARD", "NET_BANKING"].map((m) => (
                <TouchableOpacity key={m} style={[styles.methodChip, topupMethod === m && styles.methodChipActive]} onPress={() => setTopupMethod(m)}>
                  <Text style={[styles.methodText, topupMethod === m && { color: "#fff" }]}>{m.replace("_", " ")}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTopupModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleTopup} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Add Money</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  walletCard: { backgroundColor: "#1e3a8a", margin: 16, marginTop: Platform.OS === "ios" ? 56 : 16, borderRadius: 20, padding: 20 },
  walletLabel: { color: "#93c5fd", fontSize: 13 },
  walletAmt: { color: "#fff", fontSize: 36, fontWeight: "800", marginVertical: 4 },
  topupBtn: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  topupBtnText: { color: "#fff", fontWeight: "700" },
  dueBanner: { backgroundColor: "#7c2d12", marginHorizontal: 16, borderRadius: 10, padding: 10, marginBottom: 4 },
  dueBannerText: { color: "#fca5a5", fontWeight: "600", fontSize: 13 },
  card: { backgroundColor: "#1e293b", borderRadius: 14, padding: 16, marginBottom: 10 },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  feeType: { color: "#f1f5f9", fontWeight: "700", fontSize: 16 },
  status: { fontWeight: "700", fontSize: 13 },
  amount: { color: "#cbd5e1", fontSize: 15, marginTop: 4 },
  dueDate: { color: "#64748b", fontSize: 12, marginTop: 2, marginBottom: 10 },
  payBtn: { backgroundColor: "#1e3a8a", borderRadius: 10, padding: 12, alignItems: "center" },
  payBtnText: { color: "#93c5fd", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "#00000090", justifyContent: "flex-end" },
  modal: { backgroundColor: "#1e293b", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { color: "#f1f5f9", fontSize: 18, fontWeight: "800", marginBottom: 16 },
  input: { backgroundColor: "#0f172a", color: "#f1f5f9", borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#334155", fontSize: 18 },
  methodRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  methodChip: { flex: 1, backgroundColor: "#0f172a", borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  methodChipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  methodText: { color: "#64748b", fontWeight: "600", fontSize: 12 },
  modalBtns: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#334155", borderRadius: 10, padding: 14, alignItems: "center" },
  cancelBtnText: { color: "#94a3b8", fontWeight: "700" },
  confirmBtn: { flex: 1, backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});

import { Platform } from "react-native";
