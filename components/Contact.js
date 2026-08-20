import { StyleSheet, Text, View, Image, Modal, ScrollView } from "react-native";
import CustomButton from "./CustomButton";

export default function Contact({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView>
            <Text style={styles.title}>Contato</Text>
            <Image
              source={require("../Images/frente.jpeg")}
              style={styles.image}
              resizeMode="cover"
            />
            <Text style={styles.text}>
              <Text style={{ fontWeight: "bold", fontSize: 18 }}>
                Entre em contato conosco!
              </Text>
              {"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Telefone: </Text> 
                (48) 3046-3131
              {"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Email: </Text>{" "}
                atendimento@humanipharma.com.br
              {"\n\n"}
              <Text style={{ fontWeight: "bold" }}>Endereço: </Text>
              <Text>
                Rua Coronel Pedro Benedet, Sala 06, N°190 -Ed. Catarina Gaidzinski
              </Text>
              {"\n\n"}
              <Text style={{ fontWeight: "bold" }}>
                Horário de Atendimento:
              </Text>
              {"\n"}
              <Text>Segunda a Sexta: </Text>
              <Text>08:30h – 18:30h</Text>
              {"\n"}
              <Text>Sábado: </Text>
              <Text>08:30h – 12:30h</Text>
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
    fontSize: 15,
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