import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ─────────────────────────────────────────────
// PALETA "VIDA PARK"
// ─────────────────────────────────────────────
const COLORS = {
  azulVidaPark: "#202040",
  rosaVidaPark: "#E84890",
  branco: "#F8F8F8",
  rosaClaro: "#F7A8C8",
  azulSuave: "#34345C",
  rosaEscuro: "#C93678",
  textoSecundario: "#6B6B85",
  textoMutado: "#B3B3C6",
  bordaClara: "#EDEDF2",
};

const FORMAS_PAGAMENTO = [
  { id: "pix", label: "Pix", icon: "qr-code-outline" },
  { id: "credito", label: "Cartão de crédito", icon: "card-outline" },
  { id: "debito", label: "Cartão de débito", icon: "card-outline" },
];

export default function Checkout({ navigation, route }) {
  // Dados que vieram do Carrinho
  const combo = route?.params?.combo || [];
  const totalCombo = route?.params?.totalCombo || 0;
  const taxaEntrega = route?.params?.taxaEntrega || 5;
  const totalGeral = route?.params?.totalGeral || totalCombo + taxaEntrega;

  // Mock -- troque pelo endereço real do usuário (Firestore/AsyncStorage) quando o Firebase estiver pronto
  const [endereco] = useState({
    rua: "Rua das Flores, 123",
    bairro: "Centro, São Paulo - SP",
  });
  const [data] = useState("25/05/2025");
  const [horario] = useState("18:00");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [enviando, setEnviando] = useState(false);

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
  }

  async function confirmarPedido() {
    setEnviando(true);

    // ─────────────────────────────────────────────
    // TODO: integração real com Mercado Pago
    // Quando o Firebase estiver configurado, troque este bloco
    // pela chamada de Cloud Function igual ao Pagamento.js:
    //
    // const result = await callFunction("createPreference", {
    //   amount: totalGeral,
    //   description: combo.map((i) => i.nome).join(", "),
    //   payerInfo: { name, email },
    //   address: `${endereco.rua}, ${endereco.bairro}`,
    // });
    // navigation.navigate("Pagamento", { checkoutUrl: result.initPoint, ... });
    // ─────────────────────────────────────────────

    setTimeout(() => {
      setEnviando(false);
      navigation.navigate("MeusPedidos", { pedidoConfirmado: true });
    }, 800);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Endereço de entrega */}
        <View style={styles.card}>
          <View style={styles.cardTopo}>
            <Text style={styles.cardTitulo}>Endereço de entrega</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Addresses")}>
              <Text style={styles.alterarLink}>Alterar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.enderecoLinha}>
            <Ionicons name="location-outline" size={18} color={COLORS.rosaVidaPark} />
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.enderecoRua}>{endereco.rua}</Text>
              <Text style={styles.enderecoBairro}>{endereco.bairro}</Text>
            </View>
          </View>
        </View>

        {/* Data e horário */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Data e horário</Text>
          <View style={styles.dataLinha}>
            <View style={styles.dataItem}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textoSecundario} />
              <Text style={styles.dataTexto}>{data}</Text>
            </View>
            <View style={styles.dataItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textoSecundario} />
              <Text style={styles.dataTexto}>{horario}</Text>
            </View>
          </View>
        </View>

        {/* Forma de pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Forma de pagamento</Text>

          {FORMAS_PAGAMENTO.map((forma) => {
            const selecionada = formaPagamento === forma.id;
            return (
              <TouchableOpacity
                key={forma.id}
                style={styles.pagamentoLinha}
                onPress={() => setFormaPagamento(forma.id)}
              >
                <View style={styles.pagamentoEsquerda}>
                  <Ionicons name={forma.icon} size={18} color={COLORS.azulVidaPark} />
                  <Text style={styles.pagamentoLabel}>{forma.label}</Text>
                </View>
                <Ionicons
                  name={selecionada ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={selecionada ? COLORS.rosaVidaPark : COLORS.textoMutado}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer fixo */}
      <View style={styles.footer}>
        <View style={styles.totalLinha}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValor}>{formatarPreco(totalGeral)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmarButton, enviando && { opacity: 0.7 }]}
          onPress={confirmarPedido}
          disabled={enviando}
        >
          <Text style={styles.confirmarButtonText}>
            {enviando ? "PROCESSANDO..." : "CONFIRMAR PEDIDO"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branco,
  },

  // Header
  header: {
    backgroundColor: COLORS.azulVidaPark,
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: COLORS.branco,
    fontSize: 17,
    fontWeight: "700",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
    marginBottom: 4,
  },
  alterarLink: {
    fontSize: 12,
    color: COLORS.rosaVidaPark,
    fontWeight: "700",
  },

  // Endereço
  enderecoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  enderecoRua: {
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },
  enderecoBairro: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },

  // Data e horário
  dataLinha: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataTexto: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    fontWeight: "600",
  },

  // Forma de pagamento
  pagamentoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordaClara,
  },
  pagamentoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pagamentoLabel: {
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.bordaClara,
    backgroundColor: COLORS.branco,
  },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "700",
  },
  totalValor: {
    fontSize: 17,
    color: COLORS.azulVidaPark,
    fontWeight: "800",
  },
  confirmarButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmarButtonText: {
    color: COLORS.branco,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
