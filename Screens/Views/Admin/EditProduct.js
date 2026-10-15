import { View, Text, TextInput, StyleSheet, Image, Alert } from 'react-native';
import { Button } from "react-native-paper";
import { db as database } from '../../../Firebase/firebaseConfig';
import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';

export default function EditProduct({ navigation, route }) {
    const { produtoId } = route.params;

    const [carregando, setCarregando] = useState(true);
    const [nome, setNome] = useState('');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [imagem, setImagem] = useState(null);

    useEffect(() => {
        async function carregarProduto() {
            try {
                const snap = await getDoc(doc(database, 'salgados', produtoId));
                if (snap.exists()) {
                    const dados = snap.data();
                    setNome(dados.nome || '');
                    setValor(String(dados.valor ?? ''));
                    setDescricao(dados.descricao || '');
                    setImagem(dados.imagem || null);
                }
            } catch (error) {
                console.log('erro ao carregar produto', error);
                Alert.alert('Erro', 'Não foi possível carregar o produto.');
            } finally {
                setCarregando(false);
            }
        }
        carregarProduto();
    }, [produtoId]);

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

            await updateDoc(doc(database, 'salgados', produtoId), {
                nome,
                valor: parseFloat(String(valor).replace(',', '.')),
                descricao,
                imagem: imagemBase64
            });

            Alert.alert('Sucesso', 'Produto atualizado com sucesso!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            console.log('erro ao atualizar', error);
            Alert.alert('Erro', 'Não foi possível atualizar o produto.');
        }
    };

    const renderizarTextoBotao = () => {
        return imagem ? 'Trocar Imagem' : 'Selecionar Imagem da Galeria';
    };

    if (carregando) {
        return (
            <View style={styles.container}>
                <Text style={styles.txt}>Carregando...</Text>
            </View>
        );
    }
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