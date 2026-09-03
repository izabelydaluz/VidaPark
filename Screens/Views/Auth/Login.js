import { TextInput,Text,StyleSheet,Alert,ImageBackground,View,TouchableOpacity,Linking,useWindowDimensions} from "react-native";
import { Button } from "react-native-paper";
import { useState } from "react";
import { auth, database } from "../firebaseConfig";
import {signInWithEmailAndPassword,signOut} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Entypo from '@expo/vector-icons/Entypo';

const imagemDesktop = require("../Images/logo.png");
const imagemMobile = require("../Images/logo.png");

const abrirInstagram = async () => {

  const url = "https://www.instagram.com/vidapark/";

  const supported = await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Não foi possível abrir o Instagram");
  }

};

export default function Login({ navigation }) {

  const { width } = useWindowDimensions();
  const imagemFundo = width < 600 ? imagemMobile : imagemDesktop;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(true);
  const [carregando, setCarregando] = useState(false);

  const EntrarConta = async () => {

    if (!email || !senha) {

      Alert.alert(
        "Aviso",
        "Preencha todos os campos"
      );
      return;
    }

    try {

      setCarregando(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          senha
        );
      const user = userCredential.user;

      const clienteRef = doc(
        database,
        "usuarios",
        user.uid
      );

      const clienteSnap = await getDoc(clienteRef);

      if (!clienteSnap.exists()) {

        Alert.alert(
          "Erro",
          "Dados do usuário não encontrados."
        );
        await signOut(auth);

        return;
      }

      const dadosUsuario =
        clienteSnap.data();

      if (dadosUsuario.banido === true) {

        await signOut(auth);

        Alert.alert(
          "Conta Bloqueada",
          "Você foi bloqueado e não pode acessar o aplicativo."
        );

        return;
      }

      if (dadosUsuario.role === "admin") {
        navigation.navigate("ADM");
        return;
      }

      navigation.navigate("Home");

    } catch (error) {

      console.log(error);

      Alert.alert(
        "Erro",
        "E-mail ou senha incorretos."
      );

    } finally {

      setCarregando(false);

    }

  };


  return (

    <ImageBackground source={imagemFundo} style={styles.fundo} resizeMode="cover" >

      <View style={styles.overlay}>

        <TextInput style={styles.barra} placeholder="E-mail" placeholderTextColor="#666" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"  autoCorrect={false} />


        <View style={styles.senha}>

          <TextInput style={styles.input} placeholder="Senha" placeholderTextColor="#666" value={senha} onChangeText={setSenha}  secureTextEntry={mostrarSenha}  />

          <TouchableOpacity onPress={() =>setMostrarSenha(!mostrarSenha) } >

            <Entypo
              name={
                mostrarSenha
                  ? "eye-with-line"
                  : "eye"
              }
              size={24}
              color="#852b4aff"
            />

          </TouchableOpacity>

        </View>


        <Button style={styles.button} buttonColor="#852b4aff" textColor="#ffffffff" mode="contained"onPress={EntrarConta}loading={carregando}  disabled={carregando} >
          Entrar
        </Button>

        <TouchableOpacity onPress={() => navigation.navigate("Cadastrar") }>
          <Text style={styles.textoConta}> Não possui uma conta ainda?
            <Text style={styles.cadastro}> {" "}Cadastre-se </Text>
            </Text>

        </TouchableOpacity>


        <View style={styles.footer}>

          <TouchableOpacity  style={styles.instagramContainer} onPress={abrirInstagram}>

            <Entypo
              name="instagram-with-circle"
              size={24}
              color="#852b4aff"
            />

            <Text style={styles.instagramText}> @VidaPark</Text>

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
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 420,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
    marginTop: -20,
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

  textoConta: {
    color: "#FFFFFF",
  },

  cadastro: {
    fontWeight: "bold",
    color: "#af1e51ff",
  },

  footer: {
    position: "absolute",
    bottom: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  instagramContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  instagramText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "bold",
    color: "#53162bff",
  },

});