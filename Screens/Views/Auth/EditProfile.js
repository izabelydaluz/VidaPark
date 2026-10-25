import {View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../../Firebase/firebaseConfig";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";

import { useTheme } from "../../../context/ThemeContext";
import * as ImagePicker from "expo-image-picker";
import { lerFotoLocal, salvarFotoLocal } from "../utils/perfilLocal";

const NOME_MIN = 2;
const NOME_MAX = 60;

export default function EditProfile({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(auth.currentUser?.email || "");
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const { theme } = useTheme();

  // Valores originais, para saber se o usuário mudou alguma coisa
  const original = useRef({ name: "", photo: null });
  const jaSalvou = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const user = auth.currentUser;
      if (!user) {
        setCarregandoDados(false);
        return;
      }

      let nome = user.displayName || "";
      try {
        const snap = await getDoc(doc(db, "usuarios", user.uid));
        if (snap.exists() && snap.data().nome) nome = snap.data().nome;
      } catch {
        // sem conexão: usa o nome que já está no perfil do Firebase Auth
      }

      const foto = await lerFotoLocal(user.uid);

      if (!ativo) return;
      original.current = { name: nome, photo: foto };
      setName(nome);
      setPhotoUri(foto);
      setEmail(user.email || "");
      setCarregandoDados(false);
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const alterado = name.trim() !== original.current.name.trim() || photoUri !== original.current.photo;

  // Avisa antes de sair com alterações não salvas (botão voltar, gesto ou seta do topo)
  useEffect(() => {
    const remover = navigation.addListener("beforeRemove", (e) => {
      if (!alterado || jaSalvou.current || loading) return;

      e.preventDefault();
      Alert.alert("Descartar alterações?", "Você tem alterações que ainda não foram salvas.", [
        { text: "Continuar editando", style: "cancel" },
        { text: "Descartar", style: "destructive", onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return remover;
  }, [navigation, alterado, loading]);

  async function pickImage() {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        Alert.alert("Permissão necessária", "Permita o acesso às fotos para escolher uma imagem de perfil.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.3,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível abrir a galeria. Tente novamente.");
    }
  }

  async function handleSave() {
    const nomeLimpo = name.trim();

    if (nomeLimpo.length < NOME_MIN) {
      Alert.alert("Erro", `Informe seu nome (mínimo ${NOME_MIN} caracteres).`);
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      // 1) Nome no Firestore (o administrador também enxerga) e no perfil do Firebase Auth
      if (nomeLimpo !== original.current.name.trim()) {
        await setDoc(doc(db, "usuarios", user.uid), { nome: nomeLimpo }, { merge: true });
        await updateProfile(user, { displayName: nomeLimpo }).catch(() => {});
      }

      // 2) Foto, guardada no aparelho (separada por usuário)
      if (photoUri !== original.current.photo) {
        await salvarFotoLocal(user.uid, photoUri);
      }

      jaSalvou.current = true;
      Alert.alert("Sucesso", "Perfil atualizado com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o perfil. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const inicial = name.trim() ? name.trim()[0].toUpperCase() : "U";

  if (carregandoDados) {
    return (
      <View style={[styles.container, styles.centro, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>Editar Perfil</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} accessibilityRole="button" accessibilityLabel="Alterar foto de perfil">
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={[styles.avatarImage, { borderColor: theme.primary }]} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.avatarText}>{inicial}</Text>
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

          {photoUri ? (
            <TouchableOpacity onPress={() => setPhotoUri(null)} style={styles.removePhoto}>
              <Text style={[styles.removePhotoText, { color: theme.textMuted }]}>Remover foto</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.primary }]}>Nome completo</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.accent }]}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome"
            placeholderTextColor={theme.textMuted}
            maxLength={NOME_MAX}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          <Text style={[styles.label, { color: theme.primary }]}>E-mail</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled, { backgroundColor: theme.surface, color: theme.textMuted, borderColor: theme.border }]}
            value={email}
            editable={false}
            placeholder="Seu e-mail"
            placeholderTextColor={theme.textMuted}
          />
          <Text style={[styles.hint, { color: theme.textMuted }]}>O e-mail não pode ser alterado</Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar alterações</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centro: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  avatarSection: { alignItems: "center", marginBottom: 30 },
  avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, marginBottom: 4, borderWidth: 3 },
  avatarText: { color: "#fff", fontSize: 42, fontWeight: "bold" },
  editIcon: { position: "absolute", bottom: 4, right: -4, width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  changePhotoButton: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
  changePhotoText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  removePhoto: { marginTop: 10, padding: 6 },
  removePhotoText: { fontSize: 13, textDecorationLine: "underline" },
  form: { paddingHorizontal: 20 },
  label: { fontSize: 15, fontWeight: "bold", marginBottom: 8, marginTop: 12 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1 },
  inputDisabled: { color: "#999" },
  hint: { fontSize: 12, marginTop: 4 },
  saveButton: { marginHorizontal: 20, marginTop: 30, padding: 16, borderRadius: 30, alignItems: "center" },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
