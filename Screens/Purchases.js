import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, where, getDocs } from "firebase/firestore";
import { database, auth } from "../firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function Purchases({ navigation }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadPurchases();
    });
    return unsubscribe;
  }, [navigation]);

  async function loadPurchases() {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setPurchases([]);
        setLoading(false);
        return;
      }

      const q = query(
        collection(database, "payments"),
        where("payer.email", "==", user.email)
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      list.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setPurchases(list);
    } catch (error) {
      console.log("Erro ao carregar compras:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status) {
    switch (status) {
      case "approved": return "#4CAF50";
      case "pending": return "#FF9800";
      case "rejected":
      case "cancelled": return "#f44336";
      case "refunded": return "#9C27B0";
      default: return "#999";
    }
  }

  function getStatusLabel(status) {
    switch (status) {
      case "approved": return "Aprovado";
      case "pending": return "Pendente";
      case "rejected": return "Recusado";
      case "cancelled": return "Cancelado";
      case "refunded": return "Reembolsado";
      case "in_process": return "Em processamento";
      default: return status || "Desconhecido";
    }
  }

  function formatMoney(value) {
    if (!value) return "R$ 0,00";
    return `R$ ${Number(value).toFixed(2).replace(".", ",")}`;
  }

  function formatDate(date) {
    if (!date) return "";
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>Carregando compras...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Minhas Compras</Text>
        <View style={{ width: 24 }} />
      </View>

      {purchases.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color={theme.accent} />
          <Text style={[styles.emptyText, { color: theme.primary }]}>Nenhuma compra encontrada</Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
            Suas compras aparecerao aqui apos finalizar um pedido.
          </Text>
          <TouchableOpacity
            style={[styles.shopButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("Catalog")}
          >
            <Text style={styles.shopButtonText}>Ir as compras</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.purchaseCard, { backgroundColor: theme.surface }]}>
              <View style={styles.purchaseHeader}>
                <Text style={[styles.purchaseDescription, { color: theme.primary }]}>
                  {item.description || "Compra Bella Plus"}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.purchaseDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color={theme.textMuted} />
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>{formatMoney(item.amount)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={16} color={theme.textMuted} />
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>{formatDate(item.createdAt)}</Text>
                </View>
                {item.paymentMethod && (
                  <View style={styles.detailRow}>
                    <Ionicons name="card-outline" size={16} color={theme.textMuted} />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                      {item.paymentMethod === "pix" ? "PIX" : item.paymentMethod === "boleto" ? "Boleto" : item.paymentMethod === "card" ? "Cartao de credito" : item.paymentMethod === "debit_card" ? "Cartao de debito" : item.paymentMethod === "checkout" ? "Checkout MercadoPago" : item.paymentMethod}
                    </Text>
                  </View>
                )}
                {item.mpId && (
                  <View style={styles.detailRow}>
                    <Ionicons name="finger-print-outline" size={16} color={theme.textMuted} />
                    <Text style={[styles.detailText, { color: theme.textSecondary }]}>ID: {item.mpId}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 20 },
  shopButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
  shopButtonText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  list: { padding: 16, gap: 12 },
  purchaseCard: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  purchaseHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  purchaseDescription: { fontSize: 16, fontWeight: "bold", flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: "bold" },
  purchaseDetails: { gap: 8 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailText: { fontSize: 14 },
});
