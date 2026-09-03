import React, { useState } from "react";
import { TextInput,Text,StyleSheet,Alert,ImageBackground,View,TouchableOpacity,Linking,useWindowDimensions} from "react-native";
import { Button } from "react-native-paper";

import Entypo from "@expo/vector-icons/Entypo";

import { auth, database } from "../firebaseConfig";
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




export default function Cadastrar({ navigation }) {

 const { width, height } = useWindowDimensions();
  const imagemFundo = width < 600 ? imagemMobile : imagemDesktop;


const [nome, setNome] = useState("");
const [email, setEmail] = useState("");
const [senha, setSenha] = useState("");
const [mostrarSenha, setMostrarSenha] = useState(true);


const CriarConta = async () => {
  if (!nome || !email || !senha) {
    Alert.alert("Aviso", "Preencha todos os campos");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      senha
    );

    const user = userCredential.user;

    await setDoc(doc(database, "usuarios", user.uid), {
      nome: nome.trim(),
      email: email.trim(),
      role: "cliente",
      banido: false,
      criadoEm: serverTimestamp(),
    });

    await signOut(auth);

    Alert.alert(
      "Cadastro realizado!",
      "Sua conta foi criada. Agora faça login.",
      [
        {
          text: "OK",
          onPress: () => navigation.navigate("Login"),
        },
      ]
    );

  } catch (error) {
    console.log(error);

    Alert.alert(
      "Erro",
      "Não foi possível criar a conta."
    );
  }
};


  return (
    <ImageBackground source={imagemFundo} style={styles.fundo} resizeMode="stretch">
     <View style={styles.overlay}>


        <TextInput style={styles.barra}  placeholder="Nome"   placeholderTextColor="#666" value={nome} onChangeText={setNome} autoCapitalize="words" />

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
