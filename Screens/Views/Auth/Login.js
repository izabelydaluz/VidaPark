import {
  TextInput, Text, StyleSheet, Alert, ImageBackground, View, TouchableOpacity, Linking,
  useWindowDimensions, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { Button } from "react-native-paper";
import { useEffect, useRef, useState } from "react";

import { auth, db as database } from "../../../Firebase/firebaseConfig";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Entypo from "@expo/vector-icons/Entypo";

const logo = require("../../../Images/logo.png");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Traduz o código de erro do Firebase Auth para uma mensagem que o usuário entende.
function mensagemDeErroLogin(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "E-mail ou senha incorretos.";
    case "auth/too-many-requests":
      return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
    case "auth/network-request-failed":
      return "Sem conexão com a internet. Verifique sua rede e tente novamente.";
    case "auth/user-disabled":
      return "Esta conta foi desativada.";
    default:
      return "Não foi possível entrar. Tente novamente.";
  }
}

export default function Login({ navigation }) {
  const { height } = useWindowDimensions();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [ocultarSenha, setOcultarSenha] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [enviandoRedefinicao, setEnviandoRedefinicao] = useState(false);
  // Enquanto o app confere se já existe uma sessão salva, não mostramos o formulário.
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  const senhaRef = useRef(null);
  const roteando = useRef(false);

  // Lê o perfil do usuário e leva para a tela certa.
  // Retorna true se conseguiu entrar, false se a conta não pode acessar o app.
  // Se a leitura do Firestore falhar, o erro é lançado para quem chamou tratar.
  async function rotearUsuario(user) {
    if (roteando.current) return true;
    roteando.current = true;

    try {
      const snap = await getDoc(doc(database, "usuarios", user.uid));

      if (!snap.exists()) {
        await signOut(auth);
        Alert.alert("Erro", "Dados do usuário não encontrados.");
        return false;
      }

      const dados = snap.data();

      if (dados.banido === true) {
        await signOut(auth);
        Alert.alert("Conta Bloqueada", "Você foi bloqueado e não pode acessar o aplicativo.");
        return false;
      }

      // reset: remove o Login do histórico, então o botão "voltar" não retorna para ele.
      navigation.reset({
        index: 0,
        routes: [{ name: dados.role === "admin" ? "ADM" : "Home" }],
      });
      return true;
    } finally {
      roteando.current = false;
    }
  }

  // Login automático: se o Firebase já tem uma sessão salva, entra direto.
  useEffect(() => {
    let ativo = true;
    let jaRespondeu = false;
    let cancelar;

    cancelar = onAuthStateChanged(auth, async (user) => {
      // só interessa o primeiro estado (o que foi restaurado ao abrir o app)
      if (jaRespondeu) return;
      jaRespondeu = true;
      cancelar?.();

      if (!user) {
        if (ativo) setVerificandoSessao(false);
        return;
      }

      try {
        const entrou = await rotearUsuario(user);
        if (!entrou && ativo) setVerificandoSessao(false);
      } catch {
        // sem conexão ou erro de leitura: deixa o usuário na tela de login
        if (ativo) setVerificandoSessao(false);
      }
    });

    return () => {
      ativo = false;
      jaRespondeu = true;
      cancelar?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const EntrarConta = async () => {
    const emailLimpo = email.trim().toLowerCase();

    if (!emailLimpo || !senha) {
      Alert.alert("Aviso", "Preencha todos os campos");
      return;
    }

    if (!EMAIL_REGEX.test(emailLimpo)) {
      Alert.alert("Aviso", "Digite um e-mail válido.");
      return;
    }

    setCarregando(true);

    let userCredential;
    try {
      userCredential = await signInWithEmailAndPassword(auth, emailLimpo, senha);
    } catch (error) {
      Alert.alert("Erro", mensagemDeErroLogin(error));
      setCarregando(false);
      return;
    }

    try {
      await rotearUsuario(userCredential.user);
    } catch {
      // a senha estava certa, mas não deu para ler o perfil (ex.: sem internet):
      // desfaz o login para não deixar o usuário "meio logado" preso nesta tela.
      await signOut(auth).catch(() => {});
      Alert.alert("Erro", "Não foi possível carregar seus dados. Verifique sua conexão e tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  // Envia o e-mail de redefinição de senha para o endereço digitado no campo de e-mail.
  const EsqueciSenha = async () => {
    const emailLimpo = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(emailLimpo)) {
      Alert.alert(
        "Esqueci minha senha",
        "Digite seu e-mail no campo acima e toque em “Esqueci minha senha” novamente."
      );
      return;
    }

    setEnviandoRedefinicao(true);
    try {
      auth.languageCode = "pt"; // e-mail do Firebase em português
      await sendPasswordResetEmail(auth, emailLimpo);

      // Mensagem propositalmente genérica: não revela se o e-mail tem conta ou não.
      Alert.alert(
        "Verifique seu e-mail",
        `Se existir uma conta com ${emailLimpo}, enviamos um link para criar uma nova senha. Confira também a caixa de spam.`
      );
    } catch (error) {
      switch (error?.code) {
        case "auth/invalid-email":
          Alert.alert("Erro", "Digite um e-mail válido.");
          break;
        case "auth/too-many-requests":
          Alert.alert("Erro", "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.");
          break;
        case "auth/network-request-failed":
          Alert.alert("Erro", "Sem conexão com a internet. Verifique sua rede e tente novamente.");
          break;
        default:
          Alert.alert("Erro", "Não foi possível enviar o e-mail agora. Tente novamente.");
      }
    } finally {
      setEnviandoRedefinicao(false);
    }
  };

  return (
    <ImageBackground source={logo} style={styles.fundo} resizeMode="cover">
      <View style={styles.overlay}>
        {verificandoSessao ? (
          <View style={styles.carregandoSessao}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.teclado}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={[styles.conteudo, { paddingTop: Math.round(height * 0.5) }]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                style={styles.barra}
                placeholder="E-mail"
                placeholderTextColor="#666"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => senhaRef.current?.focus()}
                blurOnSubmit={false}
              />

              <View style={styles.senha}>
                <TextInput
                  ref={senhaRef}
                  style={styles.input}
                  placeholder="Senha"
                  placeholderTextColor="#666"
                  value={senha}
                  onChangeText={setSenha}
                  secureTextEntry={ocultarSenha}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={EntrarConta}
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

              <Button
                style={styles.button}
                buttonColor="#852b4aff"
                textColor="#ffffffff"
                mode="contained"
                onPress={EntrarConta}
                loading={carregando}
                disabled={carregando}
              >
                Entrar
              </Button>

              <TouchableOpacity
                onPress={EsqueciSenha}
                disabled={enviandoRedefinicao}
                accessibilityRole="button"
                style={styles.esqueciContainer}
              >
                <Text style={styles.esqueciTexto}>
                  {enviandoRedefinicao ? "Enviando..." : "Esqueci minha senha"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("Cadastrar")}>
                <Text style={styles.textoConta}>
                  Não possui uma conta ainda?
                  <Text style={styles.cadastro}> Cadastre-se</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.instagramContainer}
                onPress={abrirInstagram}
                accessibilityRole="link"
                accessibilityLabel="Abrir o Instagram da VidaPark"
              >
                <Entypo name="instagram-with-circle" size={24} color="#852b4aff" />
                <Text style={styles.instagramText}>@VidaPark</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
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

  teclado: {
    flex: 1,
  },

  conteudo: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 40,
  },

  carregandoSessao: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  barra: {
    width: "80%",
    maxWidth: 350,
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    backgroundColor: "rgba(255,255,255,0.73)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    color: "#333",
  },

  senha: {
    width: "80%",
    maxWidth: 350,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 8,
    backgroundColor: "rgba(255,255,255,0.73)",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#333",
  },

  button: {
    margin: 10,
  },

  esqueciContainer: {
    paddingVertical: 8,
    marginBottom: 6,
  },

  esqueciTexto: {
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },

  textoConta: {
    color: "#FFFFFF",
  },

  cadastro: {
    fontWeight: "bold",
    color: "#af1e51ff",
  },

  instagramContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
  },

  instagramText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#53162bff",
  },
});