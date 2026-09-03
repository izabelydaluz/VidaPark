import React, { useState } from "react";
import { TextInput, Text, StyleSheet, Alert, ImageBackground, View, TouchableOpacity, Linking, Image, useWindowDimensions } from "react-native";

import { Button } from "react-native-paper";
import Entypo from "@expo/vector-icons/Entypo";

import { auth, database } from "../../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const imagemDesktop = require("../../../Images/logo.png");
const imagemMobile = require("../../../Images/logo.png");


const abrirInstagram = async () => {
  const url = "https://www.instagram.com/vidapark/";

  const supported = await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Não foi possível abrir o Instagram");
  }
};

// ─────────────────────────────────────────────
// Validação do campo Nome
// ─────────────────────────────────────────────
function validarNome(nome) {
  const nomeLimpo = nome.trim();

  if (!nomeLimpo) {
    return "Digite seu nome";
  }

  if (nomeLimpo.length < 3) {
    return "Nome muito curto";
  }

  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(nomeLimpo)) {
    return "Nome não pode conter números ou símbolos";
  }

  return null;
}

// Transforma "Maria Silva" em "maria-silva" -- usado como ID do documento
// que liga nome -> e-mail, pra permitir login digitando o nome.
function gerarChaveNome(nome) {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/\s+/g, "-");
}


export default function Cadastrar({ navigation }) {

 const { width, height } = useWindowDimensions();
  const imagemFundo = width < 600 ? imagemMobile : imagemDesktop;


  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const [mostrarSenha, setMostrarSenha] = useState(true);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(true);


  const CriarConta = async () => {
    if (!nome || !email || !senha || !confirmarSenha) {
      Alert.alert("Preencha todos os campos");
      return;
    }

    const erroNome = validarNome(nome);
    if (erroNome) {
      Alert.alert("Aviso", erroNome);
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("As senhas não coincidem");
      return;
    }

    const chaveNome = gerarChaveNome(nome);

    try {
      // Confere se já existe alguém cadastrado com esse mesmo nome
      const nomeRef = doc(database, 'loginPorNome', chaveNome);
      const nomeSnap = await getDoc(nomeRef);
      if (nomeSnap.exists()) {
        Alert.alert("Nome em uso", "Já existe uma conta com esse nome. Tente adicionar um sobrenome ou apelido diferente.");
        return;
      }
    } catch (error) {
      console.log("Erro ao checar nome:", error);
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      const usuario = userCredential.user;

      try {
        await setDoc(doc(database, 'usuarios', usuario.uid), {
          nome: nome.trim(),
          email: email.trim(),
          banido: false,
          role: "cliente", // admins são promovidos manualmente pelo Firebase Console
          criadoEm: serverTimestamp()
        });

        // Cria o mapeamento nome -> e-mail, usado no login por nome
        await setDoc(doc(database, 'loginPorNome', chaveNome), {
          email: email.trim(),
          uid: usuario.uid,
        });
      } catch (firestoreError) {
        console.log("Erro de permissão/gravação no Firestore: ", firestoreError);
        Alert.alert("Aviso", "Conta criada, mas houve um problema ao salvar seus dados. Fale com o suporte.");
      }

      Alert.alert("Sucesso", "Conta criada com sucesso!");
      navigation.navigate("Login");

    } catch (error) {
      console.log("Erro completo do Firebase Auth:", error);

      if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Erro", "Este e-mail já está em uso.");
      } else if (error.code === 'auth/weak-password') {
        Alert.alert("Erro", "A senha deve ter pelo menos 6 caracteres.");
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Erro", "O formato do e-mail é inválido.");
      } else {
        Alert.alert("Erro ao cadastrar", error.message);
      }
    }
  };


  return (
    <ImageBackground source={imagemFundo} style={styles.fundo} resizeMode="stretch">
     <View style={styles.overlay}>


        <TextInput
          style={styles.barra}
          placeholder="Nome"
          placeholderTextColor="#666"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
        />

        <TextInput style={styles.barra} placeholder="E-mail" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>

        <View style={styles.inputSenha}>
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={senha} onChangeText={setSenha} secureTextEntry={mostrarSenha}/>

          <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
            <Entypo
              name={mostrarSenha ? "eye-with-line" : "eye"}
              size={24}
              color="#852b4aff"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.inputSenha}>
          <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor="#666" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry={mostrarConfirmacao}/>

          <TouchableOpacity onPress={() => setMostrarConfirmacao(!mostrarConfirmacao)}>
            <Entypo
              name={mostrarConfirmacao ? "eye-with-line" : "eye"}
              size={24}
              color="#852b4aff"
            />
          </TouchableOpacity>
        </View>

        <Button mode="contained" buttonColor="#852b4aff" textColor="#ffffffff" style={styles.botao} onPress={CriarConta}>Cadastrar</Button>

        <View style={styles.footer}>

          <TouchableOpacity style={styles.instagramContainer} onPress={abrirInstagram}>
            <Entypo
              name="instagram-with-circle"
              size={24}
              color="#852b4aff"
            />
            <Text style={styles.instagramText}>@VidaPark</Text>
          </TouchableOpacity>
        </View>
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
  width: '100%',
  justifyContent: 'flex-start',
  alignItems: 'center',
  paddingTop: 420,
  paddingBottom: 40,
  backgroundColor: 'rgba(0,0,0,0.35)',
},
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  barra: {
    width: "80%",
    maxWidth: 350,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 15,
    color: "#333",
  },
  inputSenha: {
    width: "80%",
    maxWidth: 350,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    color: "#333",
  },
  botao: {
    width: "80%",
    maxWidth: 350,
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 25,
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
