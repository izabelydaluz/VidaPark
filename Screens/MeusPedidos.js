import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
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
  verdeSucesso: "#2E9E5B",
  verdeFundo: "#E4F5EA",
  laranjaAviso: "#D98A1F",
  laranjaFundo: "#FCEFD9",
};

const ABAS = [
  { id: "todos", label: "Todos" },
  { id: "andamento", label: "Em andamento" },
  { id: "concluidos", label: "Concluídos" },
];

// Mock -- troque pela busca real no Firestore (collection "pedidos") quando o Firebase estiver pronto
const PEDIDOS_MOCK = [
  {
    id: "1258",
    status: "em_preparacao",
    data: "25/05/2025",
    horario: "18:00",
    unidades: 30,
    total: 50.0,
  },
  {
    id: "1187",
    status: "entregue",
    data: "10/05/2025",
    horario: "19:30",
    unidades: 50,
    total: 75.0,
  },
];

function statusInfo(status) {
  switch (status) {
    case "em_preparacao":
      return { label: "Em preparação", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, aba: "andamento" };
    case "saiu_para_entrega":
      return { label: "Saiu para entrega", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, aba: "andamento" };
    case "entregue":
      return { label: "Entregue", cor: COLORS.verdeSucesso, fundo: COLORS.verdeFundo, aba: "concluidos" };
    case "cancelado":
      return { label: "Cancelado", cor: "#C0392B", fundo: "#FBE3E1", aba: "concluidos" };
    default:
      return { label: status, cor: COLORS.textoMutado, fundo: COLORS.bordaClara, aba: "todos" };
  }
}

function formatarPreco(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

export default function MeusPedidos({ navigation }) {
  const [abaAtiva, setAbaAtiva] = useState("todos");
  const [pedidos] = useState(PEDIDOS_MOCK);

  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (abaAtiva === "todos") return true;
    return statusInfo(pedido.status).aba === abaAtiva;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus pedidos</Text>
      </View>

      {/* Abas */}
      <View style={styles.abasWrapper}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.id;
          return (
            <TouchableOpacity
              key={aba.id}
              style={styles.abaItem}
              onPress={() => setAbaAtiva(aba.id)}
            >
              <Text style={[styles.abaLabel, ativa && styles.abaLabelAtiva]}>{aba.label}</Text>
              {ativa && <View style={styles.abaIndicador} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      {pedidosFiltrados.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textoMutado} />
          <Text style={styles.emptyText}>Nenhum pedido por aqui ainda</Text>
        </View>
      ) : (
        <FlatList
          data={pedidosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const status = statusInfo(item.status);
            return (
              <TouchableOpacity
                style={styles.pedidoCard}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("PedidoDetalhes", { pedido: item })}
              >
                <View style={styles.pedidoTopo}>
                  <Text style={styles.pedidoNumero}>Pedido #{item.id}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.fundo }]}>
                    <Text style={[styles.statusTexto, { color: status.cor }]}>{status.label}</Text>
                  </View>
                </View>

                <Text style={styles.pedidoData}>
                  {item.data} às {item.horario}
                </Text>
                <Text style={styles.pedidoUnidades}>{item.unidades} unidades</Text>

                <View style={styles.pedidoRodape}>
                  <Text style={styles.pedidoTotal}>Total: {formatarPreco(item.total)}</Text>

                  {item.status === "entregue" ? (
                    <TouchableOpacity onPress={() => navigation.navigate("AvaliarPedido", { pedido: item })}>
                      <Text style={styles.avaliarLink}>Avaliar pedido ★</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.verDetalhesLink}>Ver detalhes ›</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerTitle: {
    color: COLORS.branco,
    fontSize: 19,
    fontWeight: "700",
  },

  // Abas
  abasWrapper: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordaClara,
  },
  abaItem: {
    marginRight: 22,
    paddingBottom: 10,
    alignItems: "center",
  },
  abaLabel: {
    fontSize: 13,
    color: COLORS.textoMutado,
    fontWeight: "600",
  },
  abaLabelAtiva: {
    color: COLORS.rosaVidaPark,
  },
  abaIndicador: {
    marginTop: 6,
    height: 3,
    width: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.rosaVidaPark,
  },

  // Lista
  lista: {
    padding: 16,
  },
  pedidoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pedidoTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pedidoNumero: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusTexto: {
    fontSize: 11,
    fontWeight: "700",
  },
  pedidoData: {
    fontSize: 12,
    color: COLORS.textoMutado,
  },
  pedidoUnidades: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },
  pedidoRodape: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  pedidoTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  verDetalhesLink: {
    fontSize: 12,
    color: COLORS.rosaVidaPark,
    fontWeight: "700",
  },
  avaliarLink: {
    fontSize: 12,
    color: COLORS.laranjaAviso,
    fontWeight: "700",
  },

  // Vazio
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    color: COLORS.textoMutado,
    fontSize: 14,
  },
});
