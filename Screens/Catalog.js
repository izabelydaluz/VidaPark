import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Text } from "react-native";
import { collection, getDocs } from "firebase/firestore";
import { database } from "../firebaseConfig";
import ProductCard from "../components/ProductCard";
import ProductModal from "../components/ProductModal";
import { useTheme } from "../context/ThemeContext";

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { theme } = useTheme();

  async function carregarProdutos() {
    try {
      const querySnapshot = await getDocs(collection(database, "produtos"));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setProducts(lista);
    } catch (error) {
      console.log("Erro ao carregar produtos:", error);
    }
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.primary }]}>Nenhum produto cadastrado ainda</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={setSelectedProduct} />
          )}
        />
      )}

      <ProductModal product={selectedProduct} visible={selectedProduct !== null} onClose={() => setSelectedProduct(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontStyle: "italic",
  },
});
