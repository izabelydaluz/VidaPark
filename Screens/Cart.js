import React, { useState } from "react";
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useProducts } from "../context/ProductContext";
import ProductModal from "../components/ProductModal";
import { useTheme } from "../context/ThemeContext";

export default function Cart({ navigation }) {
  const { cart } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { theme } = useTheme();

  function finalizarCompra() {
    navigation.navigate("Pagamento");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.primary }]}>Carrinho vazio</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.item, { backgroundColor: theme.surface }]} onPress={() => setSelectedProduct(item)}>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: theme.primary }]}>{item.nome}</Text>
                  <Text style={[styles.itemPrice, { color: theme.accent }]}>{item.preco}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={[styles.finalizarButton, { backgroundColor: theme.primary }]} onPress={finalizarCompra}>
            <Text style={styles.finalizarText}>Finalizar Compra</Text>
          </TouchableOpacity>
        </>
      )}

      <ProductModal
        product={selectedProduct}
        visible={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
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
  item: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  itemPrice: {
    fontSize: 14,
    marginTop: 4,
  },
  finalizarButton: {
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginVertical: 20,
  },
  finalizarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
