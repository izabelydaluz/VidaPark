import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { View, StyleSheet, Text, Alert, TouchableOpacity, ActivityIndicator, Modal, TextInput, FlatList } from "react-native";
import { WebView } from "react-native-webview";
import { useProducts } from "../../../context/ProductContext";
import { auth } from "../../../firebaseConfig";
import * as FileSystem from "expo-file-system/legacy";

const FUNCTIONS_URL = "https://us-central1-bella-plus-mulherao.cloudfunctions.net";
const ADDRESSES_FILE = `${FileSystem.documentDirectory}bellaplus_addresses.json`;

async function callFunction(name, data) {
  const response = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (result.error) {
    throw new Error(result.error.message || "Erro desconhecido");
  }
  return result;
}

function parsePrice(preco) {
  if (!preco) return 0;
  if (typeof preco === "number") return preco;
  const cleaned = preco.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function formatMoney(value) {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default function Pagamento({ navigation }) {
  const { cart, clearCart } = useProducts();

  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentResult, setPaymentResult] = useState(null);
  const [polling, setPolling] = useState(false);
  const [externalRef, setExternalRef] = useState(null);
  const pollingRef = useRef(null);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + parsePrice(item.preco), 0);
  }, [cart]);

  const description = useMemo(() => {
    return cart.map((item) => item.nome || "Produto").join(", ");
  }, [cart]);

  useEffect(() => {
    if (cart.length === 0) {
      Alert.alert("Carrinho vazio", "Adicione produtos ao carrinho antes de pagar", [
        { text: "OK", onPress: () => navigation.navigate("Catalog") },
      ]);
      return;
    }
    loadAddresses();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  async function loadAddresses() {
    try {
      const info = await FileSystem.getInfoAsync(ADDRESSES_FILE);
      if (info.exists) {
        const data = await FileSystem.readAsStringAsync(ADDRESSES_FILE);
        const list = JSON.parse(data);
        setAddresses(list);
        if (list.length === 1) {
          setSelectedAddress(list[0]);
        } else if (list.length > 1) {
          setShowAddressModal(true);
        } else {
          Alert.alert(
            "Endereço necessário",
            "Adicione um endereço de entrega antes de continuar.",
            [{ text: "OK", onPress: () => navigation.navigate("Addresses") }]
          );
        }
      } else {
        Alert.alert(
          "Endereço necessário",
          "Adicione um endereço de entrega antes de continuar.",
          [{ text: "OK", onPress: () => navigation.navigate("Addresses") }]
        );
      }
    } catch (e) {
      console.error("Erro ao carregar endereços:", e);
    }
  }

  function getFullAddress(addr) {
    return [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipCode ? `CEP: ${addr.zipCode}` : ""].filter(Boolean).join(", ");
  }

  async function createPreference() {
    try {
      const user = auth.currentUser;
      const email = user?.email || "cliente@email.com";
      const name = user?.displayName || "Cliente";

      const result = await callFunction("createPreference", {
        amount: total,
        description: description || "Compra Bella Plus",
        payerInfo: { name, email },
        address: selectedAddress ? getFullAddress(selectedAddress) : "",
      });
      setCheckoutUrl(result.initPoint);
      setExternalRef(result.externalReference);
    } catch (error) {
      Alert.alert("Erro", error.message || "Erro ao iniciar pagamento", [
        { text: "Voltar", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleWebViewMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "checkout") {
        const status = data.status;
        const paymentId = data.paymentId || null;

        if (status === "success" || status === "approved") {
          if (paymentId) {
            verifyByPaymentId(paymentId);
          } else {
            setCheckoutUrl(null);
            setPaymentResult({
              status: "approved",
              statusDetail: "Pagamento aprovado",
              transactionAmount: total,
              paymentId,
            });
          }
        } else if (status === "failure" || status === "rejected") {
          setCheckoutUrl(null);
          Alert.alert("Pagamento recusado", "Tente novamente com outra forma de pagamento.", [
            { text: "OK", onPress: () => navigation.goBack() },
          ]);
        } else {
          startVerification();
        }
      }
    } catch (e) {
      console.log("Erro ao processar mensagem do WebView:", e);
    }
  }, [total, externalRef]);

  async function verifyByPaymentId(paymentId) {
    try {
      setPolling(true);
      const result = await callFunction("getPaymentStatus", { paymentId });
      if (result.success && result.payment) {
        const p = result.payment;
        setCheckoutUrl(null);
        setPaymentResult({
          status: p.status,
          statusDetail: p.statusDetail || p.status,
          transactionAmount: total,
          paymentId: p.id,
        });
      }
    } catch (error) {
      console.log("Erro ao verificar pagamento:", error);
      setCheckoutUrl(null);
      setPaymentResult({
        status: "pending",
        statusDetail: "Pagamento em processamento. Verifique sua conta.",
        transactionAmount: total,
        paymentId,
      });
    } finally {
      setPolling(false);
    }
  }

  async function verifyByExternalRef() {
    if (!externalRef) return;
    try {
      const result = await callFunction("verifyPaymentByRef", { externalReference: externalRef });
      if (result.success && result.found && result.status === "approved") {
        return true;
      }
      return false;
    } catch (e) {
      console.log("Verify by ref error:", e);
      return false;
    }
  }

  function startVerification() {
    if (pollingRef.current) return;
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 15;

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts >= maxAttempts) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPolling(false);
        setCheckoutUrl(null);
        setPaymentResult({
          status: "pending",
          statusDetail: "Pagamento ainda nao confirmado. Verifique sua conta ou aguarde.",
          transactionAmount: total,
        });
        return;
      }
      const approved = await verifyByExternalRef();
      if (approved) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
        setPolling(false);
        setCheckoutUrl(null);
        setPaymentResult({
          status: "approved",
          statusDetail: "Pagamento aprovado",
          transactionAmount: total,
        });
      }
    }, 5000);
  }

  function handleFinish() {
    clearCart();
    setPaymentResult(null);
    navigation.navigate("Catalog");
  }

  if (paymentResult) {
    const status = paymentResult.status;
    return (
      <View style={styles.resultContainer}>
        <Text style={[styles.resultIcon, status === "approved" ? styles.iconSuccess : styles.iconOther]}>
          {status === "approved" ? "\u2713" : "\u2717"}
        </Text>
        <Text style={styles.resultTitle}>
          {status === "approved"
            ? "Pagamento Aprovado!"
            : status === "pending"
            ? "Pagamento Pendente"
            : "Pagamento Recusado"}
        </Text>
        <Text style={styles.resultStatus}>{paymentResult.statusDetail}</Text>
        <Text style={styles.resultAmount}>{formatMoney(paymentResult.transactionAmount)}</Text>

        {status === "pending" && (
          <TouchableOpacity
            style={[styles.finishButton, { backgroundColor: "#e58aaa", marginBottom: 12 }]}
            onPress={() => {
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              setPaymentResult(null);
              setCheckoutUrl(null);
              navigation.goBack();
            }}
          >
            <Text style={styles.finishButtonText}>Voltar ao Carrinho</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
          <Text style={styles.finishButtonText}>Voltar ao Catalogo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showAddressModal) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#eadde1" }]}>
        <View style={styles.addressModal}>
          <Text style={styles.addressModalTitle}>Selecione o endereço de entrega</Text>
          <FlatList
            data={addresses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.addressOption}
                onPress={() => {
                  setSelectedAddress(item);
                  setShowAddressModal(false);
                }}
              >
                <Text style={styles.addressLabel}>{item.label}</Text>
                <Text style={styles.addressText}>{getFullAddress(item)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.addressEmpty}>Nenhum endereço cadastrado</Text>
            }
          />
          <TouchableOpacity
            style={styles.addressAddButton}
            onPress={() => {
              setShowAddressModal(false);
              navigation.navigate("Addresses");
            }}
          >
            <Text style={styles.addressAddText}>+ Adicionar novo endereço</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (selectedAddress && !checkoutUrl && !paymentResult && loading) {
    createPreference();
  }

  if (checkoutUrl) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerBack}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mercado Pago</Text>
          {polling ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.headerBack}>Verificando...</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={startVerification}>
              <Text style={styles.headerBack}>Verificar</Text>
            </TouchableOpacity>
          )}
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          style={{ flex: 1 }}
          onMessage={handleWebViewMessage}
          onNavigationStateChange={(navState) => {
            const url = navState.url || "";
            if (url.includes("checkout-result.html")) {
              const params = url.includes("?")
                ? new URLSearchParams(url.split("?")[1])
                : new URLSearchParams("");
              const mpStatus = params.get("status") || params.get("r") || "unknown";
              const paymentId = params.get("payment_id") || null;

              if (mpStatus === "approved" || mpStatus === "success") {
                if (paymentId) {
                  verifyByPaymentId(paymentId);
                } else {
                  startVerification();
                }
              } else if (mpStatus === "rejected" || mpStatus === "failure") {
                setCheckoutUrl(null);
                Alert.alert("Pagamento recusado", "Tente novamente com outra forma de pagamento.", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              } else {
                startVerification();
              }
            }
          }}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8b3151" />
              <Text style={styles.loadingText}>Carregando pagamento...</Text>
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#8b3151" />
      <Text style={styles.loadingText}>Preparando pagamento...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#eadde1" },
  loadingText: { marginTop: 16, fontSize: 16, color: "#8b3151" },
  addressModal: { width: "90%", maxHeight: "80%", backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  addressModalTitle: { fontSize: 18, fontWeight: "bold", color: "#8b3151", textAlign: "center", marginBottom: 16 },
  addressOption: { backgroundColor: "#f9f0f3", borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: "#e58aaa" },
  addressLabel: { fontSize: 15, fontWeight: "bold", color: "#8b3151", marginBottom: 4 },
  addressText: { fontSize: 13, color: "#666", lineHeight: 18 },
  addressEmpty: { fontSize: 14, color: "#999", textAlign: "center", marginVertical: 20 },
  addressAddButton: { marginTop: 10, padding: 12, borderRadius: 20, backgroundColor: "#e58aaa", alignItems: "center" },
  addressAddText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,247,250,0.9)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#8b3151", paddingHorizontal: 16, paddingVertical: 12, paddingTop: 48 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  headerBack: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  resultContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#eadde1", padding: 24 },
  resultIcon: { fontSize: 64, marginBottom: 16 },
  iconSuccess: { color: "#4CAF50" },
  iconOther: { color: "#f44336" },
  resultTitle: { fontSize: 24, fontWeight: "bold", color: "#8b3151", textAlign: "center", marginBottom: 8 },
  resultStatus: { fontSize: 16, color: "#666", marginBottom: 8, textAlign: "center" },
  resultAmount: { fontSize: 28, fontWeight: "bold", color: "#e58aaa", marginBottom: 32 },
  finishButton: { backgroundColor: "#8b3151", padding: 16, borderRadius: 30, width: "100%", alignItems: "center" },
  finishButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
