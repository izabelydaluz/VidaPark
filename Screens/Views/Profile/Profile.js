import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, signOut, onAuthStateChanged } from "../../../firebaseConfig";
import { useTheme } from "../../../context/ThemeContext";
import * as FileSystem from "expo-file-system/legacy";

const PROFILE_FILE = `${FileSystem.documentDirectory}bellaplus_profile.json`;

export default function Profile({ navigation }) {
  const [user, setUser] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const [savedName, setSavedName] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setUser(auth.currentUser);
      loadProfile();
    });
    return unsubscribe;
  }, [navigation]);

  async function loadProfile() {
    try {
      const info = await FileSystem.getInfoAsync(PROFILE_FILE);
      if (info.exists) {
        const data = JSON.parse(await FileSystem.readAsStringAsync(PROFILE_FILE));
        setPhotoUri(data.photo || null);
        setSavedName(data.name || null);
      }
    } catch (e) {}
  }

  function logout() {
    Alert.alert(
      "Sair da conta",
      "Deseja realmente sair?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          onPress: async () => {
            try {
              await signOut(auth);
              setUser(null);
              navigation.navigate("Login");
            } catch (error) {
              Alert.alert("Erro", "Nao foi possivel sair da conta.");
            }
          },
        },
      ]
    );
  }

  function getInitials() {
    const name = savedName || user?.displayName;
    if (name) {
      const parts = name.split(" ");
      return (parts[0][0] + (parts[parts.length - 1][0] || "")).toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  }

  function getDisplayName() {
    if (savedName) return savedName;
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split("@")[0];
    return "Usuario";
  }

  function getEmail() {
    return user?.email || "usuario@email.com";
  }

  const options = [
    {
      title: "Minhas compras",
      subtitle: "Veja seus pedidos e historico",
      icon: "receipt-outline",
      action: () => navigation.navigate("Purchases"),
    },
    {
      title: "Alterar senha",
      subtitle: "Atualize sua senha de acesso",
      icon: "lock-closed-outline",
      action: () => navigation.navigate("ChangePassword"),
    },
    {
      title: "Editar perfil",
      subtitle: "Altere seus dados pessoais",
      icon: "person-outline",
      action: () => navigation.navigate("EditProfile"),
    },
    {
      title: "Meus enderecos",
      subtitle: "Gerencie seus enderecos de entrega",
      icon: "location-outline",
      action: () => navigation.navigate("Addresses"),
    },
    {
      title: "Configuracoes",
      subtitle: "Preferencias do aplicativo",
      icon: "settings-outline",
      action: () => navigation.navigate("Settings"),
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.profileBox}>
        <View style={styles.avatarContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={[styles.avatarImage, { borderColor: theme.primary }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.editIcon, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate("EditProfile")}
          >
            <Ionicons name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={[styles.name, { color: theme.primary }]}>{getDisplayName()}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{getEmail()}</Text>
      </View>

      <View style={styles.menu}>
        {options.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.card, { backgroundColor: theme.surface }]}
            onPress={item.action}
          >
            <View style={styles.cardLeft}>
              <Ionicons name={item.icon} size={24} color={theme.accent} style={styles.cardIcon} />
              <View>
                <Text style={[styles.cardTitle, { color: theme.primary }]}>{item.title}</Text>
                <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>{item.subtitle}</Text>
              </View>
            </View>
            <Text style={[styles.arrow, { color: theme.primary }]}>›</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.logout, { backgroundColor: theme.accent }]} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 15,
  },
  profileBox: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
  },
  avatarText: {
    color: "#fff",
    fontSize: 38,
    fontWeight: "bold",
  },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
  },
  email: {
    fontSize: 14,
    marginTop: 5,
  },
  menu: {
    gap: 12,
  },
  card: {
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardIcon: {
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  cardSubtitle: {
    marginTop: 5,
    fontSize: 13,
  },
  arrow: {
    fontSize: 30,
  },
  logout: {
    marginTop: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
