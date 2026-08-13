import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, onAuthStateChanged } from "../firebaseConfig";
import { useTheme } from "../context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";

const PROFILE_FILE = `${FileSystem.documentDirectory}bellaplus_profile.json`;

export default function EditProfile({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    loadProfile();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setEmail(user.email || "");
      }
    });
    return unsubscribe;
  }, []);

  async function loadProfile() {
    try {
      const info = await FileSystem.getInfoAsync(PROFILE_FILE);
      if (info.exists) {
        const data = JSON.parse(await FileSystem.readAsStringAsync(PROFILE_FILE));
        if (data.photo) setPhotoUri(data.photo);
        if (data.name) setName(data.name);
      } else if (auth.currentUser?.displayName) {
        setName(auth.currentUser.displayName);
      }
    } catch (e) {}
  }

  async function pickImage() {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Erro", "O nome nao pode estar vazio.");
      return;
    }

    setLoading(true);
    try {
      const profileData = { name: name.trim(), photo: photoUri || "" };
      await FileSystem.writeAsStringAsync(PROFILE_FILE, JSON.stringify(profileData));
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Erro", String(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={[styles.avatarImage, { borderColor: theme.primary }]} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>
                {name ? name[0].toUpperCase() : "U"}
              </Text>
            </View>
          )}
          <View style={[styles.editIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="camera" size={18} color="#fff" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.changePhotoButton, { backgroundColor: theme.accent }]} onPress={pickImage}>
          <Ionicons name="image-outline" size={18} color="#fff" />
          <Text style={styles.changePhotoText}>Alterar foto</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.primary }]}>Nome completo</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.accent }]}
          value={name}
          onChangeText={setName}
          placeholder="Seu nome"
          placeholderTextColor={theme.textMuted}
        />

        <Text style={[styles.label, { color: theme.primary }]}>E-mail</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled, { backgroundColor: theme.surface, color: theme.textMuted, borderColor: theme.border }]}
          value={email}
          editable={false}
          placeholder="Seu e-mail"
          placeholderTextColor={theme.textMuted}
        />
        <Text style={[styles.hint, { color: theme.textMuted }]}>O e-mail nao pode ser alterado</Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Salvar alteracoes</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  avatarSection: { alignItems: "center", marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 4, borderWidth: 3 },
  avatarText: { color: "#fff", fontSize: 42, fontWeight: "bold" },
  editIcon: { position: "absolute", bottom: 4, right: -4, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  changePhotoButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  changePhotoText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 15, fontWeight: "bold", marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1 },
  inputDisabled: { color: "#999" },
  hint: { fontSize: 12, marginTop: 4 },
  saveButton: { marginHorizontal: 20, marginTop: 30, padding: 16, borderRadius: 30, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
