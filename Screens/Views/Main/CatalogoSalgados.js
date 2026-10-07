import React, { useState, useEffect } from "react";
import {View,Text,FlatList,TouchableOpacity,Image,TextInput,StyleSheet,ActivityIndicator} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { useTheme } from "../../../context/ThemeContext";
import { db as database } from "../../../Firebase/firebaseConfig";

const COLORS = {
  azulVidaPark: "#202040",
  rosaVidaPark: "#E84890",
};

export default function CatalogoSalgados({ navigation }) {
  const { theme } = useTheme();

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  async function carregarSalgados() {
    try {
      setLoading(true);

      const querySnapshot = await getDocs(collection(database, "salgados"));

      const lista = [];

      querySnapshot.forEach((doc) => {
        lista.push({
          id: doc.id,
          ...doc.data(),
        });
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

  const produtosFiltrados = produtos.filter((item) => {
    return (
      !busca.trim() ||
      (item.nome || "").toLowerCase().includes(busca.trim().toLowerCase())
    );
  });

  function formatarPreco(valor) {
    if (typeof valor === "string") return valor;

    return `R$ ${Number(valor || 0)
      .toFixed(2)
      .replace(".", ",")}`;
  }

  return (
    <View style={styles.container}>
      {/* ----- HEADER ----- */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Salgados Avulsos
        </Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Carrinho")}
          >
            <Ionicons name="cart-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ----- BUSCA (sempre visível) ----- */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search-outline" size={16} color={theme.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: theme.primary }]}
          placeholder="Buscar salgado..."
          placeholderTextColor={theme.textMuted}
          value={busca}
          onChangeText={setBusca}
          returnKeyType="search"
        />
      </View>

      {/* ----- LISTA DE PRODUTOS ----- */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : produtosFiltrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons
            name="fast-food-outline"
            size={48}
            color={theme.textMuted}
          />

          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Nenhum salgado encontrado
          </Text>
        </View>
      ) : (
        <FlatList
          data={produtosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.surface,
                  shadowColor: theme.cardShadow,
                },
              ]}
            >
              {item.imagem ? (
                <Image
                  source={{ uri: item.imagem }}
                  style={[styles.itemImage, { backgroundColor: theme.border }]}
                />
              ) : (
                <View
                  style={[
                    styles.itemImage,
                    styles.itemImagePlaceholder,
                    { backgroundColor: theme.border },
                  ]}
                >
                  <Ionicons
                    name="fast-food-outline"
                    size={22}
                    color={theme.textMuted}
                  />
                </View>
              )}

              <View style={styles.itemInfo}>
                <Text style={[styles.itemNome, { color: theme.primary }]}>
                  {item.nome}
                </Text>

                <Text style={[styles.itemPreco, { color: theme.darkPink }]}>
                  {formatarPreco(item.preco || item.valor)}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* ----- BOTÃO FIXO: MONTE SEU COMBO ----- */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.comboButton}
          onPress={() => navigation.navigate("TamanhoCombo")}
        >
          <Text style={styles.comboButtonText}>MONTE SEU COMBO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* HEADER */
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
    fontSize: 17,
    fontWeight: "700",
  },

  headerIcons: {
    flexDirection: "row",
    gap: 6,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  /* BUSCA */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
  },

  /* LISTA */
  lista: {
    padding: 16,
    paddingBottom: 100,
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,

    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  itemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: "700",
  },

  itemPreco: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: "600",
  },

  /* LOADING / VAZIO */
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  emptyText: {
    fontSize: 14,
  },

  /* FOOTER */
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.rosaVidaPark,
    padding: 10,
    borderTopWidth: 1,
    borderRadius: 100,
  },

  comboButton: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },

  comboButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});