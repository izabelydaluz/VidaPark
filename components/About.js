import { StyleSheet, Text, View, Image, Modal, ScrollView } from "react-native";
import CustomButton from "./CustomButton";

export default function About({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.title}>Quem Somos</Text>
            <Image
              source={require("../Images/frente.jpeg")}
              style={styles.image}
              resizeMode="cover"
            />

            <Text style={styles.text}>
              A Humani Pharma conta com profissionais com mais de 25 anos de
              experiência na área da saúde e manipulação farmacêutica.
              {"\n\n"}
              Cada pessoa possui características únicas, desde sua composição
              bioquímica até suas experiências e necessidades individuais. Por
              isso, buscamos oferecer tratamentos personalizados, promovendo
              mais qualidade de vida e bem-estar.
              {"\n\n"}
              Nossa equipe especializada trabalha continuamente no
              desenvolvimento de novas tecnologias e formulações, proporcionando
              terapias mais eficazes e maior adesão ao tratamento.
            </Text>
          </ScrollView>

          <CustomButton
            title="Fechar"
            buttonColor="#721214"
            onPress={onClose}
            style={styles.button}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#721214",
    textAlign: "center",
    marginBottom: 15,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 15,
    marginBottom: 15,
  },
  text: {
    fontSize: 14,
    color: "#5A3A32",
    lineHeight: 22,
    textAlign: "justify",
    marginBottom: 20,
  },
  button: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 10,
  },
});