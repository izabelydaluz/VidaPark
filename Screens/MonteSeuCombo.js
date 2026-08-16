import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { database } from "../firebaseConfig";

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
  amareloFundo: "#FFF6E0",
  amareloBorda: "#F4D998",
  amareloTexto: "#9A7B1E",
};

const MINIMO_UNIDADES = 50;

export default function MonteSeuCombo({ navigation }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantidades, setQuantidades] = useState({}); // { produtoId: quantidade }

  async function carregarSalgados() {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(database, "salgados"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setProdutos(lista);
    } catch (error) {
      console.log("Erro ao carregar salgados:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarSalgados();
  }, []);

  function alterarQuantidade(produtoId, delta) {
    setQuantidades((prev) => {
      const atual = prev[produtoId] || 0;
      const nova = Math.max(0, atual + delta);
      return { ...prev, [produtoId]: nova };
    });
  }

  function precoUnitario(item) {
    const valor = item.preco ?? item.valor ?? 0;
    return typeof valor === "string" ? parseFloat(valor.replace(",", ".")) : Number(valor);
  }

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
  }

  const totalUnidades = useMemo(
    () => Object.values(quantidades).reduce((soma, qtd) => soma + qtd, 0),
    [quantidades]
  );

  const totalValor = useMemo(() => {
    return produtos.reduce((soma, item) => {
      const qtd = quantidades[item.id] || 0;
      return soma + qtd * precoUnitario(item);
    }, 0);
  }, [produtos, quantidades]);

  const progresso = Math.min(totalUnidades / MINIMO_UNIDADES, 1);
  const atingiuMinimo = totalUnidades >= MINIMO_UNIDADES;

  function adicionarAoCarrinho() {
    if (!atingiuMinimo) {
      Alert.alert(
        "Mínimo não atingido",
        `Selecione pelo menos ${MINIMO_UNIDADES} unidades para continuar.`
      );
      return;
    }

    const itensSelecionados = produtos
      .filter((item) => (quantidades[item.id] || 0) > 0)
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidade: quantidades[item.id],
        precoUnitario: precoUnitario(item),
      }));

    // Ajuste aqui para sua lógica real de carrinho (Context, AsyncStorage, Firestore...)
    navigation.navigate("Carrinho", { combo: itensSelecionados, total: totalValor });
  }

  return (
    <View style={styles.container}>
      {/* ───── HEADER ───── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Monte seu combo</Text>

        <TouchableOpacity
          style={styles.iconButton}
          onPress={() =>
            Alert.alert(
              "Monte seu combo",
              `Escolha as quantidades dos sabores que quiser até atingir o mínimo de ${MINIMO_UNIDADES} unidades.`
            )
          }
        >
          <Ionicons name="information-circle-outline" size={22} color={COLORS.branco} />
        </TouchableOpacity>
      </View>

      {/* ───── AVISO DE MÍNIMO ───── */}
      <View style={styles.avisoBox}>
        <Text style={styles.avisoTitulo}>Mínimo de {MINIMO_UNIDADES} unidades</Text>
        <Text style={styles.avisoSubtitulo}>Escolha entre os sabores abaixo</Text>
      </View>

      {/* ───── PROGRESSO ───── */}
      <View style={styles.progressoWrapper}>
        <Text style={styles.progressoLabel}>
          Você selecionou{" "}
          <Text style={{ fontWeight: "700", color: COLORS.azulVidaPark }}>
            {totalUnidades} / {MINIMO_UNIDADES}
          </Text>
        </Text>
        <View style={styles.progressoBarraFundo}>
          <View
            style={[
              styles.progressoBarraPreenchida,
              { width: `${progresso * 100}%`, backgroundColor: atingiuMinimo ? COLORS.rosaVidaPark : COLORS.rosaClaro },
            ]}
          />
        </View>
      </View>

      {/* ───── LISTA DE SABORES ───── */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.rosaVidaPark} />
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const qtd = quantidades[item.id] || 0;
            return (
              <View style={styles.itemCard}>
                {item.imagem ? (
                  <Image source={{ uri: item.imagem }} style={styles.itemImage} />
                ) : (
                  <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                    <Ionicons name="fast-food-outline" size={20} color={COLORS.textoMutado} />
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={styles.itemNome}>{item.nome}</Text>
                  <Text style={styles.itemPreco}>{formatarPreco(precoUnitario(item))}</Text>
                </View>

                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperButton, qtd === 0 && styles.stepperButtonDisabled]}
                    onPress={() => alterarQuantidade(item.id, -1)}
                    disabled={qtd === 0}
                  >
                    <Ionicons name="remove" size={16} color={qtd === 0 ? COLORS.textoMutado : COLORS.branco} />
                  </TouchableOpacity>

                  <Text style={styles.stepperValor}>{qtd}</Text>

                  <TouchableOpacity style={styles.stepperButton} onPress={() => alterarQuantidade(item.id, 1)}>
                    <Ionicons name="add" size={16} color={COLORS.branco} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ───── FOOTER FIXO ───── */}
      <View style={styles.footer}>
        <View style={styles.footerResumo}>
          <Text style={styles.footerUnidades}>{totalUnidades} unidades</Text>
          <Text style={styles.footerTotal}>{formatarPreco(totalValor)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.addButton, !atingiuMinimo && styles.addButtonDisabled]}
          onPress={adicionarAoCarrinho}
        >
          <Text style={styles.addButtonText}>ADICIONAR AO CARRINHO</Text>
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

  // Aviso
  avisoBox: {
    backgroundColor: COLORS.amareloFundo,
    borderWidth: 1,
    borderColor: COLORS.amareloBorda,
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
  },
  avisoTitulo: {
    color: COLORS.amareloTexto,
    fontSize: 14,
    fontWeight: "700",
  },
  avisoSubtitulo: {
    color: COLORS.amareloTexto,
    fontSize: 12,
    marginTop: 2,
  },

  // Progresso
  progressoWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  progressoLabel: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    marginBottom: 6,
  },
  progressoBarraFundo: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.bordaClara,
    overflow: "hidden",
  },
  progressoBarraPreenchida: {
    height: "100%",
    borderRadius: 4,
  },

  // Lista
  lista: {
    padding: 16,
    paddingBottom: 130,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.bordaClara,
  },
  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemNome: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  itemPreco: {
    fontSize: 12,
    color: COLORS.rosaEscuro,
    marginTop: 3,
    fontWeight: "600",
  },

  // Stepper
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.rosaVidaPark,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperButtonDisabled: {
    backgroundColor: COLORS.bordaClara,
  },
  stepperValor: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
    minWidth: 18,
    textAlign: "center",
  },

  // Estados
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  footerResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  footerUnidades: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    fontWeight: "600",
  },
  footerTotal: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "800",
  },
  addButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonDisabled: {
    backgroundColor: COLORS.rosaClaro,
  },
  addButtonText: {
    color: COLORS.branco,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
