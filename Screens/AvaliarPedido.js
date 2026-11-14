import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../Firebase/firebaseConfig";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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

const NOTAS = [1, 2, 3, 4, 5];

const TEXTOS_NOTA = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

export default function AvaliarPedido({ navigation, route }) {
  const pedido = route?.params?.pedido;

  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviarAvaliacao() {
    if (nota === 0) {
      Alert.alert("Escolha uma nota", "Toque nas estrelas para avaliar o pedido.");
      return;
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Sessão necessária", "Faça login novamente para avaliar o pedido.");
      return;
    }

    setEnviando(true);
    try {
      await addDoc(collection(db, "avaliacoes"), {
        pedidoId: pedido?.id || null,
        userId: uid,
        nota,
        comentario: comentario.trim(),
        criadoEm: serverTimestamp(),
      });

      Alert.alert("Obrigado!", "Sua avaliação foi registrada.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      console.log("Erro ao enviar avaliação:", e);
      Alert.alert("Erro", "Não foi possível enviar sua avaliação. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.btnVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.rosaVidaPark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Avaliar pedido</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.titulo}>Como foi seu pedido?</Text>

          {pedido?.data ? (
            <Text style={styles.subtitulo}>
              Pedido entregue em {pedido.data}
              {pedido.horario ? ` às ${pedido.horario}` : ""}
            </Text>
          ) : null}

          <View style={styles.estrelas}>
            {NOTAS.map((valor) => {
              const ativa = valor <= nota;
              return (
                <TouchableOpacity
                  key={valor}
                  onPress={() => setNota(valor)}
                  accessibilityRole="button"
                  accessibilityLabel={`${valor} ${valor === 1 ? "estrela" : "estrelas"}`}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Ionicons
                    name={ativa ? "star" : "star-outline"}
                    size={40}
                    color={ativa ? COLORS.rosaVidaPark : COLORS.textoMutado}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.notaTexto}>
            {nota > 0 ? TEXTOS_NOTA[nota] : "Selecione de 1 a 5 estrelas"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Conte o que achou (opcional)"
            placeholderTextColor={COLORS.textoMutado}
            value={comentario}
            onChangeText={setComentario}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.botao, (nota === 0 || enviando) && styles.botaoDesativado]}
          onPress={enviarAvaliacao}
          disabled={nota === 0 || enviando}
          accessibilityRole="button"
        >
          {enviando ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.botaoTexto}>ENVIAR AVALIAÇÃO</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branco,
  },
  header: {
    backgroundColor: COLORS.azulVidaPark,
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  btnVoltar: {
    marginRight: 8,
  },
  headerTitle: {
    color: COLORS.rosaVidaPark,
    fontSize: 19,
    fontWeight: "700",
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: COLORS.azulVidaPark,
  },
  subtitulo: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    color: COLORS.textoSecundario,
  },
  estrelas: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  notaTexto: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    color: COLORS.rosaVidaPark,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 110,
    fontSize: 15,
    borderColor: COLORS.bordaClara,
    color: COLORS.azulVidaPark,
    backgroundColor: COLORS.branco,
  },
  botao: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoTexto: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
