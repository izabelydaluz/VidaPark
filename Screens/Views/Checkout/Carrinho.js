import React, { useMemo } from "react";
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
};

const TAXA_ENTREGA = 5.0;

export default function Carrinho({ navigation, route }) {
  // Vem da tela "Monte seu Combo": navigation.navigate("Carrinho", { combo, total })
  const combo = route?.params?.combo || [];
  const totalCombo = route?.params?.total || 0;

  const totalUnidades = useMemo(
    () => combo.reduce((soma, item) => soma + item.quantidade, 0),
    [combo]
  );

  const totalGeral = totalCombo + (combo.length > 0 ? TAXA_ENTREGA : 0);

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
  }

  function finalizarPedido() {
    navigation.navigate("Checkout", { combo, totalCombo, taxaEntrega: TAXA_ENTREGA, totalGeral });
  }

  // ───── CARRINHO VAZIO ─────
  if (combo.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meu carrinho</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.emptyBox}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={40} color={COLORS.textoMutado} />
          </View>
          <Text style={styles.emptyTitle}>Seu carrinho está vazio</Text>
          <Text style={styles.emptySubtitle}>Adicione itens para continuar seu pedido.</Text>

          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate("CatalogoSalgados")}
          >
            <Text style={styles.emptyButtonText}>VER CATÁLOGO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ───── CARRINHO COM ITENS ─────
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meu carrinho</Text>
        <View style={styles.iconButton} />
      </View>

      <FlatList
        data={combo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.resumoCard}>
            <View style={styles.resumoTopo}>
              <View>
                <Text style={styles.resumoTitulo}>Monte seu combo</Text>
                <Text style={styles.resumoSubtitulo}>
                  {totalUnidades} unidades{"   "}
                  <Text style={styles.resumoValorDestaque}>{formatarPreco(totalCombo)}</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={styles.editarButton}
                onPress={() => navigation.navigate("MonteSeuCombo")}
              >
                <Text style={styles.editarButtonText}>Editar combo</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemLinha}>
            <Text style={styles.itemNome}>
              {item.nome} <Text style={styles.itemQtd}>{item.quantidade} un.</Text>
            </Text>
            <Text style={styles.itemPreco}>
              {formatarPreco(item.quantidade * item.precoUnitario)}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.resumoFinal}>
            <View style={styles.linhaValor}>
              <Text style={styles.linhaLabel}>Taxa de entrega</Text>
              <Text style={styles.linhaValorTexto}>{formatarPreco(TAXA_ENTREGA)}</Text>
            </View>
            <View style={[styles.linhaValor, styles.linhaTotal]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValorTexto}>{formatarPreco(totalGeral)}</Text>
            </View>
          </View>
        }
      />

      {/* Footer fixo */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.finalizarButton} onPress={finalizarPedido}>
          <Text style={styles.finalizarButtonText}>FINALIZAR PEDIDO</Text>
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

  // Lista
  lista: {
    padding: 16,
    paddingBottom: 130,
  },

  // Resumo do combo
  resumoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  resumoTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  resumoTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  resumoSubtitulo: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    marginTop: 6,
  },
  resumoValorDestaque: {
    color: COLORS.rosaEscuro,
    fontWeight: "700",
  },
  editarButton: {
    borderWidth: 1,
    borderColor: COLORS.rosaVidaPark,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editarButtonText: {
    color: COLORS.rosaVidaPark,
    fontSize: 12,
    fontWeight: "700",
  },

  // Linha de item
  itemLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordaClara,
  },
  itemNome: {
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },
  itemQtd: {
    fontSize: 12,
    color: COLORS.textoMutado,
    fontWeight: "400",
  },
  itemPreco: {
    fontSize: 14,
    color: COLORS.textoSecundario,
    fontWeight: "600",
  },

  // Resumo final
  resumoFinal: {
    marginTop: 16,
  },
  linhaValor: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  linhaLabel: {
    fontSize: 13,
    color: COLORS.textoSecundario,
  },
  linhaValorTexto: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    fontWeight: "600",
  },
  linhaTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.bordaClara,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "800",
  },
  totalValorTexto: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "800",
  },

  // Footer fixo
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.branco,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.bordaClara,
  },
  finalizarButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  finalizarButtonText: {
    color: COLORS.branco,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Carrinho vazio
  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.bordaClara,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    textAlign: "center",
    marginTop: 6,
  },
  emptyButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 24,
  },
  emptyButtonText: {
    color: COLORS.branco,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
