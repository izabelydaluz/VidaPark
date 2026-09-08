import { View, Text, TextInput, StyleSheet, Image, Alert } from 'react-native';
import { Button } from "react-native-paper";
import { db as database } from '../../../Firebase/firebaseConfig';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';


export default function EditProduct({ navigation, route }) {
    const { produto, aoSalvar } = route.params;
    
    const [nome, setNome] = useState(produto.nome);
    const [valor, setValor] = useState(String(produto.valor));
    const [descricao, setDescricao] = useState(produto.descricao);
    const [imagem, setImagem] = useState(produto.imagem);

    const escolherImagem = async () => {
        let resultado = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.2,
            width: 400,
            height: 400,
        });

        if (!resultado.canceled) {
            setImagem(resultado.assets[0].uri);
        }
    };

    const Salvar = async () => {
        try {
            let imagemBase64 = imagem;

            if (imagem && imagem.startsWith('file://')) {
                const response = await fetch(imagem);
                const blob = await response.blob();
                imagemBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }

            const produtoRef = doc(database, 'salgados', produto.id);
            await updateDoc(produtoRef, {
                nome,
                valor: parseFloat(valor),
                descricao,
                imagem: imagemBase64
            });
            
            Alert.alert('Sucesso', 'Produto atualizado com sucesso!', [
                {
                    text: 'OK',
                    onPress: () => {
                        navigation.goBack();
                        if (aoSalvar) {
                            setTimeout(() => {
                                aoSalvar();
                            }, 100);
                        }
                    }
                }
            ]);

        } catch (error) {
            console.log('erro ao atualizar', error);
            Alert.alert('Erro', 'Não foi possível atualizar o produto.');
        }
    };

    const renderizarTextoBotao = () => {
        if (imagem) {
            return 'Trocar Imagem';
        } else {
            return 'Selecionar Imagem da Galeria';
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.txt}>Editar Produto</Text>
            
            <TextInput style={styles.barra} placeholder="Nome" value={nome} onChangeText={setNome} placeholderTextColor={'#e58aaa'} />
            <TextInput style={styles.barra} placeholder="Valor" value={valor} onChangeText={setValor} placeholderTextColor={'#e58aaa'} />
            <TextInput style={styles.barra} placeholder="Descrição" value={descricao} onChangeText={setDescricao} placeholderTextColor={'#e58aaa'} />

            <Button 
                style={styles.GaleriaButton} 
                buttonColor="#8b3151" 
                textColor="#ffffff" 
                mode='contained' 
                onPress={escolherImagem}
            >
                {renderizarTextoBotao()}
            </Button>

            {imagem && (
                <Image source={{ uri: imagem }} style={styles.Previa} />
            )}

            <View style={styles.colunaBotoes}>
                <Button style={styles.button} buttonColor="#e58aaa" textColor="#8b3151" mode='contained' onPress={Salvar}>Salvar</Button>
                <Button style={styles.button} buttonColor="#e58aaa" textColor="#8b3151" mode='contained' onPress={() => navigation.goBack()}>Voltar</Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    txt: {
        fontSize: 36,  
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#e58aaa',
        textAlign: 'center',
        marginBottom: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.9)',
        textShadowOffset: { width: 3, height: 3 },
        textShadowRadius: 6,
        letterSpacing: 2,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#290814',
    },
    GaleriaButton: {
        width: 280,
        marginVertical: 8,
        borderRadius: 12,
    },
    Previa: {
        width: 100,
        height: 100,
        borderRadius: 10,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: '#e58aaa'
    },
    button: {
        width: '100%',
        borderRadius: 12,
    },
    colunaBotoes: {
        flexDirection: 'column',
        width: 280,
        marginTop: 10,
        gap: 12,
    },
    barra: {
        width: 280,
        padding: 12,
        borderRadius: 12,
        marginVertical: 8,
        backgroundColor: '#3d0c1e',
        borderWidth: 1,
        borderColor: '#8b3151',
        alignSelf: 'center',
        color: '#ffffff',
    },
    picker: {
        width: '100%',
        height: 50,
        color: '#e58aaa',
        backgroundColor: '#3d0c1e',
    },
    itemPicker: {
        backgroundColor: '#3d0c1e',
        color: '#ffffff',
    }
});