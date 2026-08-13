import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  auth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "../firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function ChangePassword({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(true);
  const [showNew, setShowNew] = useState(true);
  const [showConfirm, setShowConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas nao coincidem.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Erro", "A nova senha deve ser diferente da atual.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      Alert.alert("Sucesso", "Senha alterada com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        Alert.alert("Erro", "A senha atual esta incorreta.");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Erro", "A nova senha e muito fraca.");
      } else {
        Alert.alert("Erro", "Nao foi possivel alterar a senha. Tente novamente.");
      }
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
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Alterar Senha</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={60} color={theme.accent} />
      </View>

      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Para alterar sua senha, primeiro digite a senha atual e depois a nova senha.
      </Text>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.primary }]}>Senha atual</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={showCurrent}
            placeholder="Digite sua senha atual"
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
            <Ionicons name={showCurrent ? "eye-off" : "eye"} size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.primary }]}>Nova senha</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={showNew}
            placeholder="Digite a nova senha"
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity onPress={() => setShowNew(!showNew)}>
            <Ionicons name={showNew ? "eye-off" : "eye"} size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.primary }]}>Confirmar nova senha</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={showConfirm}
            placeholder="Confirme a nova senha"
            placeholderTextColor={theme.textMuted}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Ionicons name={showConfirm ? "eye-off" : "eye"} size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: theme.primary }, loading && styles.saveButtonDisabled]}
        onPress={handleChangePassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Alterar Senha</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    paddingHorizontal: 30,
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 30,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
