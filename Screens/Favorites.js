import React, { useState } from "react";
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useProducts } from "../context/ProductContext";
import ProductModal from "../components/ProductModal";
import { useTheme } from "../context/ThemeContext";

export default function Favorites() {
  const { favorites, addToCart } = useProducts();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.primary }]}>Nenhum favorito ainda</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.item, { backgroundColor: theme.surface }]} onPress={() => setSelectedProduct(item)}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: theme.primary }]}>{item.nome}</Text>
                <Text style={[styles.itemPrice, { color: theme.accent }]}>{item.preco}</Text>
              </View>
              <TouchableOpacity
                style={[styles.cartButton, { backgroundColor: theme.primary }]}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.cartButtonText}>Carrinho</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
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
  cartButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  cartButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
});
