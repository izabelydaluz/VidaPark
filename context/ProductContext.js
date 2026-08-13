import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import * as FileSystem from "expo-file-system/legacy";

const ProductContext = createContext();

const FAVORITES_FILE = `${FileSystem.documentDirectory}bellaplus_favorites.json`;
const CART_FILE = `${FileSystem.documentDirectory}bellaplus_cart.json`;

export function ProductProvider({ children }) {
  const [favorites, setFavorites] = useState([]);
  const [cart, setCart] = useState([]);
  const loaded = useRef(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [favoritesExists, cartExists] = await Promise.all([
          FileSystem.getInfoAsync(FAVORITES_FILE),
          FileSystem.getInfoAsync(CART_FILE),
        ]);
        if (favoritesExists.exists) {
          const savedFavorites = await FileSystem.readAsStringAsync(FAVORITES_FILE);
          setFavorites(JSON.parse(savedFavorites));
        }
        if (cartExists.exists) {
          const savedCart = await FileSystem.readAsStringAsync(CART_FILE);
          setCart(JSON.parse(savedCart));
        }
      } catch (e) {
        console.error("Erro ao carregar dados:", e);
      } finally {
        loaded.current = true;
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (loaded.current) {
      FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify(favorites));
    }
  }, [favorites]);

  useEffect(() => {
    if (loaded.current) {
      FileSystem.writeAsStringAsync(CART_FILE, JSON.stringify(cart));
    }
  }, [cart]);

  function addFavorite(product) {
    setFavorites((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }

  function removeFavorite(productId) {
    setFavorites((prev) => prev.filter((p) => p.id !== productId));
  }

  function isFavorite(productId) {
    return favorites.some((p) => p.id === productId);
  }

  function addToCart(product) {
    setCart((prev) => {
      if (prev.some((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((p) => p.id !== productId));
  }

  function isInCart(productId) {
    return cart.some((p) => p.id === productId);
  }

  function clearCart() {
    setCart([]);
    FileSystem.writeAsStringAsync(CART_FILE, JSON.stringify([]));
  }

  function clearFavorites() {
    setFavorites([]);
    FileSystem.writeAsStringAsync(FAVORITES_FILE, JSON.stringify([]));
  }

  return (
    <ProductContext.Provider
      value={{
        favorites,
        cart,
        addFavorite,
        removeFavorite,
        isFavorite,
        addToCart,
        removeFromCart,
        isInCart,
        clearCart,
        clearFavorites,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  return useContext(ProductContext);
}
