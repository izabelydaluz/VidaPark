import React, { useState } from "react";
import { TextInput, Text, StyleSheet, Alert, ImageBackground, View, TouchableOpacity, Linking, Image, useWindowDimensions } from "react-native";
 
import { Button } from "react-native-paper";
import Entypo from "@expo/vector-icons/Entypo";
 
import { auth, database, createUserWithEmailAndPassword } from "../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
 
const imagemDesktop = require("../Images/roupa2.png");
const imagemMobile = require("../Images/roupa2Mobile.png");
 
 
const abrirInstagram = async () => {
  const url = "https://www.instagram.com/bellaplusmulherao/";
 
  const supported = await Linking.canOpenURL(url);
 
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Não foi possível abrir o Instagram");
  }
};
 
 
export default function Cadastrar({ navigation }) {
 
  const { width, height } = useWindowDimensions();
  const imagemFundo = width < 600
    ? imagemMobile
    : imagemDesktop;
 
 
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
 
  const [mostrarSenha, setMostrarSenha] = useState(true);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(true);
 
 
  const CriarConta = async () => {
    if (!email || !senha || !confirmarSenha) {
      Alert.alert("Preencha todos os campos");
      return;
    }
    if (senha !== confirmarSenha) {
      Alert.alert("As senhas não coincidem");
      return;
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), senha);
      const usuario = userCredential.user;
 
      try {
        await setDoc(doc(database, 'usuarios', usuario.uid), {
          email: email.trim(),
          banido: false,
          criadoEm: serverTimestamp()
        });
      } catch (firestoreError) {
        console.log("Erro de permissão/gravação no Firestore: ", firestoreError);
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
 
        <View style={styles.logoContainer}>
          <Image
            style={{
              width: width < 600 ? width * 0.80 : width * 0.35,
              height: height < 600 ? 160 : 220,
              resizeMode: "contain"
            }}
            source={require("../Images/logo.png")}
          />
        </View>
 
        <TextInput style={styles.barra} placeholder="E-mail" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
 
        <View style={styles.inputSenha}>
          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={senha} onChangeText={setSenha} secureTextEntry={mostrarSenha}/>
 
          <TouchableOpacity onPress={() => setMostrarSenha(!mostrarSenha)}>
            <Entypo
              name={mostrarSenha ? "eye-with-line" : "eye"}
              size={24}
              color="#e58aaa"
            />
          </TouchableOpacity>
        </View>
 
        <View style={styles.inputSenha}>
          <TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor="#666" value={confirmarSenha} onChangeText={setConfirmarSenha} secureTextEntry={mostrarConfirmacao}/>
 
          <TouchableOpacity onPress={() => setMostrarConfirmacao(!mostrarConfirmacao)}>
            <Entypo
              name={mostrarConfirmacao ? "eye-with-line" : "eye"}
              size={24}
              color="#e58aaa"
            />
          </TouchableOpacity>
        </View>
 
        <Button mode="contained" buttonColor="#e58aaa" textColor="#8b3151" style={styles.botao} onPress={CriarConta}>Cadastrar</Button>
 
        <View style={styles.footer}>
 
          <TouchableOpacity style={styles.instagramContainer} onPress={abrirInstagram}>
            <Entypo
              name="instagram-with-circle"
              size={24}
              color="#e58aaa"
            />
            <Text style={styles.instagramText}>@bellaplusmulherao</Text>
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
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 60,
    backgroundColor: "rgba(0,0,0,0.35)",
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
    color: "#e58aaa",
    fontWeight: "bold",
    fontSize: 16,
  },
});