import React, { useState, useEffect } from "react";
import { View,Text,FlatList,TouchableOpacity,Image,TextInput,StyleSheet,ActivityIndicator} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { database } from "../../../firebaseConfig";

//Palheta de cores!!!
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

const CATEGORIAS = [
  { id: "todos", label: "Todos" },
  { id: "fritos", label: "Fritos" },
  { id: "assados", label: "Assados" },
  { id: "doces", label: "Doces" },
];

export default function CatalogoSalgados({ navigation }) {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [busca, setBusca] = useState("");
  const [itensCarrinho, setItensCarrinho] = useState(0);

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

  const produtosFiltrados = produtos.filter((item) => {
    const categoriaOk = categoriaAtiva === "todos" || item.categoria === categoriaAtiva;
    const buscaOk = !busca || (item.nome || "").toLowerCase().includes(busca.toLowerCase());
    return categoriaOk && buscaOk;
  });

  function adicionarRapido(item) {
    // Adiciona 1 unidade direto -- ajuste para sua lógica real de carrinho/combo
    setItensCarrinho((prev) => prev + 1);
  }

  function formatarPreco(valor) {
    if (typeof valor === "string") return valor;
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
  }

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Salgados Avulsos</Text>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => setBusca(busca === "" ? " " : "")}>
            <Ionicons name="search-outline" size={20} color={COLORS.branco} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.navigate("Carrinho")}
          >
            <Ionicons name="cart-outline" size={20} color={COLORS.branco} />
            {itensCarrinho > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{itensCarrinho}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

    
      {busca !== "" && (
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textoMutado} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar salgado..."
            placeholderTextColor={COLORS.textoMutado}
            value={busca === " " ? "" : busca}
            onChangeText={setBusca}
            autoFocus
          />
        </View>
      )}


      <View style={styles.categoriasWrapper}>
        <FlatList
          data={CATEGORIAS}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriasList}
          renderItem={({ item }) => {
            const ativo = categoriaAtiva === item.id;
            return (
              <TouchableOpacity
                style={[styles.categoriaPill, ativo && styles.categoriaPillAtiva]}
                onPress={() => setCategoriaAtiva(item.id)}
              >
                <Text style={[styles.categoriaLabel, ativo && styles.categoriaLabelAtiva]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.rosaVidaPark} />
        </View>
      ) : produtosFiltrados.length === 0 ? (
        <View style={styles.centerBox}>
          <Ionicons name="fast-food-outline" size={48} color={COLORS.textoMutado} />
          <Text style={styles.emptyText}>Nenhum salgado encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={produtosFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name="fast-food-outline" size={22} color={COLORS.textoMutado} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemNome}>{item.nome}</Text>
                <Text style={styles.itemPreco}>{formatarPreco(item.preco || item.valor)}</Text>
              </View>
              <TouchableOpacity style={styles.addButton} onPress={() => adicionarRapido(item)}>
                <Ionicons name="add" size={20} color={COLORS.branco} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.comboButton}
          onPress={() => navigation.navigate("Combo")}
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
  cartBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    color: COLORS.branco,
    fontSize: 9,
    fontWeight: "700",
  },


  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.bordaClara,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.azulVidaPark,
  },


  categoriasWrapper: {
    marginTop: 14,
  },
  categoriasList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoriaPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.bordaClara,
    marginRight: 8,
  },
  categoriaPillAtiva: {
    backgroundColor: COLORS.rosaVidaPark,
    borderColor: COLORS.rosaVidaPark,
  },
  categoriaLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textoSecundario,
  },
  categoriaLabelAtiva: {
    color: COLORS.branco,
  },

  lista: {
    padding: 16,
    paddingBottom: 100,
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
    width: 56,
    height: 56,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  itemPreco: {
    fontSize: 13,
    color: COLORS.rosaEscuro,
    marginTop: 4,
    fontWeight: "600",
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.rosaVidaPark,
    alignItems: "center",
    justifyContent: "center",
  },

  // Estados vazios / loading
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyText: {
    color: COLORS.textoMutado,
    fontSize: 14,
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
  comboButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  comboButtonText: {
    color: COLORS.branco,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
