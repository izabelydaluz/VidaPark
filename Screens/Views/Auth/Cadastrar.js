import React, { useRef, useState } from "react";
import {TextInput, Text, StyleSheet, Alert, ImageBackground, View, TouchableOpacity, Linking, useWindowDimensions, ScrollView, KeyboardAvoidingView, Platform} from "react-native";
import { Button } from "react-native-paper";
import Entypo from "@expo/vector-icons/Entypo";

import { auth, db as database } from "../../../Firebase/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { regrasSenha } from "../utils/senha";

const logo = require("../../../Images/logo.png");

const COR_ERRO = "#ff6b6b";
const COR_OK = "#7ee08a";

const abrirInstagram = async () => {
  const url = "https://www.instagram.com/vidapark/";

  try {
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Não foi possível abrir o Instagram");
    }
  } catch {
    Alert.alert("Não foi possível abrir o Instagram");
  }
};

//Aqui é onde acontece a validação

const validarNome = (valor) => {
  if (valor.trim().length < 2) return "Informe seu nome (mínimo 2 caracteres)";
  return "";
};

const validarEmail = (valor) => {
  const email = valor.trim();
  if (!email) return "Informe seu e-mail";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "E-mail inválido. Ex.: nome@exemplo.com";
  }
  return "";
};

function TextoErro({ mensagem }) {
  if (!mensagem) return null;
  return <Text style={styles.erroTexto}>{mensagem}</Text>;
}

function ChecklistSenha({ regras }) {
  return (
    <View style={styles.checklist}>
      {regras.map((regra) => (
        <View key={regra.id} style={styles.checklistItem}>
          <Entypo
            name={regra.ok ? "check" : "cross"}
            size={16}
            color={regra.ok ? COR_OK : COR_ERRO}
          />
          <Text
            style={[
              styles.checklistTexto,
              { color: regra.ok ? COR_OK : COR_ERRO },
            ]}
          >
            {regra.texto}
          </Text>
        </View>
      ))}
    </View>
  );
}


export default function Cadastrar({ navigation }) {
  const { height } = useWindowDimensions();

  const emailRef = useRef(null);
  const senhaRef = useRef(null);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ocultarSenha, setOcultarSenha] = useState(true);
  const [carregando, setCarregando] = useState(false);

  // Campos que o usuário já "visitou" (para não mostrar erro antes da hora)
  const [tocado, setTocado] = useState({ nome: false, email: false, senha: false });

  // Erros vindos do Firebase (ex.: e-mail já cadastrado)
  const [erroServidor, setErroServidor] = useState({ email: "", senha: "" });

  const marcarTocado = (campo) =>
    setTocado((anterior) => ({ ...anterior, [campo]: true }));

  // Validação local, recalculada a cada render
  const erroNome = validarNome(nome);
  const erroEmailLocal = validarEmail(email);
  const regras = regrasSenha(senha);
  const senhaValida = regras.every((r) => r.ok);

  const formularioValido = !erroNome && !erroEmailLocal && senhaValida;

  // Erro exibido: o do servidor tem prioridade sobre o local
  const erroEmailExibido =
    erroServidor.email || (tocado.email ? erroEmailLocal : "");
  const erroNomeExibido = tocado.nome ? erroNome : "";
  const mostrarChecklist = tocado.senha || senha.length > 0;

  const traduzirErroFirebase = (error) => {
    switch (error?.code) {
      case "auth/email-already-in-use":
        setErroServidor({ email: "Este e-mail já está cadastrado.", senha: "" });
        break;
      case "auth/invalid-email":
        setErroServidor({ email: "E-mail inválido.", senha: "" });
        break;
      case "auth/weak-password":
        setErroServidor({ email: "", senha: "Senha muito fraca. Escolha uma senha mais forte." });
        break;
      case "auth/network-request-failed":
        Alert.alert("Sem conexão", "Verifique sua internet e tente novamente.");
        break;
      default:
        Alert.alert("Erro", "Não foi possível criar a conta. Tente novamente.");
    }
  };

  const CriarConta = async () => {
    // Segurança extra: valida de novo antes de chamar o Firebase
    if (!formularioValido) {
      setTocado({ nome: true, email: true, senha: true });
      return;
    }

    setCarregando(true);
    setErroServidor({ email: "", senha: "" });

    const emailLimpo = email.trim().toLowerCase();
    const nomeLimpo = nome.trim();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailLimpo, senha);
      const user = userCredential.user;

      const dadosPerfil = {
        nome: nomeLimpo,
        email: emailLimpo,
        role: "cliente",
        banido: false,
        criadoEm: serverTimestamp(),
      };

      // Cria o perfil no Firestore. Se falhar, tenta mais uma vez; se falhar de novo,
      // apaga a conta recém-criada para o usuário poder se cadastrar de novo sem
      // ficar com um e-mail "preso" sem perfil.
      try {
        await setDoc(doc(database, "usuarios", user.uid), dadosPerfil);
      } catch (erroPerfil) {
        try {
          await setDoc(doc(database, "usuarios", user.uid), dadosPerfil);
        } catch {
          await user.delete().catch(() => {});
          throw erroPerfil;
        }
      }

      // Guarda o nome no perfil do Firebase Auth (não é crítico se falhar).
      await updateProfile(user, { displayName: nomeLimpo }).catch(() => {});

      await signOut(auth);

      Alert.alert(
        "Cadastro realizado!",
        "Sua conta foi criada. Agora faça login.",
        [{ text: "OK", onPress: () => navigation.navigate("Login") }],
        { cancelable: false }
      );
    } catch (error) {
      traduzirErroFirebase(error);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ImageBackground source={logo} style={styles.fundo} resizeMode="cover">
      <KeyboardAvoidingView
        style={styles.fundo}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={[styles.conteudo, { paddingTop: Math.round(height * 0.5) }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* NOME */}
            <View style={styles.campo}>
              <TextInput
                style={[styles.barra, erroNomeExibido ? styles.bordaErro : null]}
                placeholder="Nome"
                placeholderTextColor="#666"
                value={nome}
                onChangeText={setNome}
                onBlur={() => marcarTocado("nome")}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TextoErro mensagem={erroNomeExibido} />
            </View>

            {/* E-MAIL */}
            <View style={styles.campo}>
              <TextInput
                ref={emailRef}
                style={[styles.barra, erroEmailExibido ? styles.bordaErro : null]}
                placeholder="E-mail"
                placeholderTextColor="#666"
                value={email}
                onChangeText={(texto) => {
                  setEmail(texto);
                  if (erroServidor.email) setErroServidor((e) => ({ ...e, email: "" }));
                }}
                onBlur={() => marcarTocado("email")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
                blurOnSubmit={false}
              />
              <TextoErro mensagem={erroEmailExibido} />
            </View>

            {/* SENHA */}
            <View style={styles.campo}>
              <View
                style={[
                  styles.inputSenha,
                  erroServidor.senha ? styles.bordaErro : null,
                ]}
              >
                <TextInput
                  ref={senhaRef}
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#666"
                  value={senha}
                  onChangeText={(texto) => {
                    setSenha(texto);
                    if (erroServidor.senha) setErroServidor((e) => ({ ...e, senha: "" }));
                  }}
                  onFocus={() => marcarTocado("senha")}
                  secureTextEntry={ocultarSenha}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={CriarConta}
                />

                <TouchableOpacity
                  onPress={() => setOcultarSenha(!ocultarSenha)}
                  accessibilityRole="button"
                  accessibilityLabel={ocultarSenha ? "Mostrar senha" : "Ocultar senha"}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Entypo
                    name={ocultarSenha ? "eye-with-line" : "eye"}
                    size={24}
                    color="#852b4aff"
                  />
                </TouchableOpacity>
              </View>

              <TextoErro mensagem={erroServidor.senha} />
              {mostrarChecklist && <ChecklistSenha regras={regras} />}
            </View>

            <Button
              mode="contained"
              buttonColor="#852b4aff"
              textColor="#ffffffff"
              style={styles.botao}
              onPress={CriarConta}
              disabled={!formularioValido || carregando}
              loading={carregando}
            >
              Cadastrar
            </Button>

            {!formularioValido && (tocado.nome || tocado.email || tocado.senha) && (
              <Text style={styles.dicaBotao}>
                Preencha nome, e-mail e uma senha que cumpra todas as regras para continuar.
              </Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.instagramContainer}
              onPress={abrirInstagram}
              accessibilityRole="link"
              accessibilityLabel="Abrir o Instagram da VidaPark"
            >
              <Entypo name="instagram-with-circle" size={24} color="#852b4aff" />
              <Text style={styles.instagramText}>@VidaPark</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  conteudo: {
    alignItems: "center",
    paddingBottom: 90, // espaço para o rodapé não cobrir o conteúdo
  },
  dicaBotao: {
    width: "80%",
    maxWidth: 350,
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 10,
  },
  campo: {
    width: "80%",
    maxWidth: 350,
    marginBottom: 12,
  },
  barra: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: "#333",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  inputSenha: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#333",
  },
  bordaErro: {
    borderColor: COR_ERRO,
  },
  erroTexto: {
    color: COR_ERRO,
    fontSize: 13,
    marginTop: 5,
    marginLeft: 4,
  },
  checklist: {
    marginTop: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
  },
  checklistTexto: {
    marginLeft: 8,
    fontSize: 13,
  },
  botao: {
    width: "80%",
    maxWidth: 350,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
  },
  instagramContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  instagramText: {
    marginLeft: 8,
    color: "#852b4aff",
    fontWeight: "bold",
    fontSize: 16,
  },
});