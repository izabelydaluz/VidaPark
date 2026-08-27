import { StyleSheet, Text, View, Image, Modal, ScrollView } from "react-native";
import CustomButton from "./CustomButton";


const COLORS = {
    azulVidaPark: "#202040",
    rosaVidaPark: "#E84890",
    branco: "#F8F8F8",
    rosaClaro: "#F7A8C8",
    azulSuave: "#34345C",
    rosaEscuro: "#C93678",
    textoSecundario: "#6B6B85",
    textoMutado: "#B3B3C6",
};


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
                             (48) 99832-5402
                            {"\n\n"}
                            <Text style={{ fontWeight: "bold" }}>Endereço: </Text>
                            <Text>
                                 R. Silvio Búrigo, 2284 - Monte Castelo, Tubarão - SC, 88702-501
                            </Text>
                            {"\n\n"}
                            <Text style={{ fontWeight: "bold" }}>
                                Horário de Atendimento:
                            </Text>
                            {"\n"}
                            <Text>24 Hrs </Text>
                            
                        </Text>
                    </ScrollView>

                    <CustomButton
                        title="Fechar"
                        buttonColor={COLORS.rosaVidaPark}
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
        backgroundColor: "rgba(32, 32, 64, 0.65)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 16,
    },

    modal: {
        backgroundColor: COLORS.branco,
        borderRadius: 20,
        padding: 20,
        maxHeight: "80%",
        width: "100%",

        shadowColor: COLORS.azulVidaPark,
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },

    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.azulVidaPark,
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
        color: COLORS.textoSecundario,
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