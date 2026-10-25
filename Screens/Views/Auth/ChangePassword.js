import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../../Firebase/firebaseConfig";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { useTheme } from "../../../context/ThemeContext";
import { useRef, useState } from "react";
import { regrasSenha, senhaValida } from "../utils/senha";

const COR_OK = "#2e9e4f";
const COR_PENDENTE = "#d64545";

function mensagemDeErro(error) {
  switch (error?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "A senha atual está incorreta.";
    case "auth/weak-password":
      return "A nova senha é muito fraca.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    case "auth/requires-recent-login":
      return "Por segurança, saia da conta, entre novamente e repita a alteração.";
    default:
      return "Não foi possível alterar a senha. Tente novamente.";
  }
}

export default function ChangePassword({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ocultarAtual, setOcultarAtual] = useState(true);
  const [ocultarNova, setOcultarNova] = useState(true);
  const [ocultarConfirma, setOcultarConfirma] = useState(true);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();

  const novaRef = useRef(null);
  const confirmaRef = useRef(null);

  const regras = regrasSenha(newPassword);

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }
    if (!senhaValida(newPassword)) {
      Alert.alert("Erro", "A nova senha precisa ter pelo menos 8 caracteres, uma letra maiúscula e um número.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }
    if (currentPassword === newPassword) {
      Alert.alert("Erro", "A nova senha deve ser diferente da atual.");
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert("Erro", "Sessão expirada. Faça login novamente.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert("Sucesso", "Senha alterada com sucesso!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Erro", mensagemDeErro(error));
    } finally {
      setLoading(false);
    }
  }

  function CampoSenha({ label, value, onChangeText, oculto, alternar, placeholder, inputRef, proximo, ultimo }) {
    return (
      <>
        <Text style={[styles.label, { color: theme.primary }]}>{label}</Text>
        <View style={[styles.inputContainer, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            value={value}
            onChangeText={onChangeText}
            secureTextEntry={oculto}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType={ultimo ? "done" : "next"}
            onSubmitEditing={ultimo ? handleChangePassword : () => proximo?.current?.focus()}
            blurOnSubmit={!!ultimo}
          />
          <TouchableOpacity
            onPress={alternar}
            accessibilityRole="button"
            accessibilityLabel={oculto ? "Mostrar senha" : "Ocultar senha"}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={oculto ? "eye-off" : "eye"} size={22} color={theme.accent} />
          </TouchableOpacity>
        </View>
      </>
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
          {CampoSenha({
            label: "Senha atual", value: currentPassword, onChangeText: setCurrentPassword,
            oculto: ocultarAtual, alternar: () => setOcultarAtual(!ocultarAtual),
            placeholder: "Digite sua senha atual", proximo: novaRef,
          })}

          {CampoSenha({
            label: "Nova senha", value: newPassword, onChangeText: setNewPassword,
            oculto: ocultarNova, alternar: () => setOcultarNova(!ocultarNova),
            placeholder: "Digite a nova senha", inputRef: novaRef, proximo: confirmaRef,
          })}

          {newPassword.length > 0 && (
            <View style={styles.checklist}>
              {regras.map((regra) => (
                <View key={regra.id} style={styles.checklistItem}>
                  <Ionicons
                    name={regra.ok ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={regra.ok ? COR_OK : COR_PENDENTE}
                  />
                  <Text style={[styles.checklistTexto, { color: regra.ok ? COR_OK : COR_PENDENTE }]}>
                    {regra.texto}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {CampoSenha({
            label: "Confirmar nova senha", value: confirmPassword, onChangeText: setConfirmPassword,
            oculto: ocultarConfirma, alternar: () => setOcultarConfirma(!ocultarConfirma),
            placeholder: "Confirme a nova senha", inputRef: confirmaRef, ultimo: true,
          })}
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
    </KeyboardAvoidingView>
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
  checklist: {
    marginTop: 10,
    gap: 4,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  checklistTexto: {
    marginLeft: 6,
    fontSize: 13,
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
