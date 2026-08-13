import { View, Text, StyleSheet } from 'react-native'
import { Card, Button } from 'react-native-paper';

export default function CardProduct({ nome, valor, imagem, tamanho, descricao, Excluir, Editar }) {
    return (
        <View style={styles.containerCard}>
            <Card style={styles.card}>
                <Card.Cover source={{ uri: imagem }} style={styles.imagem} />
                
                <Card.Content style={styles.conteudo}>
                    <Text style={styles.titulo}>{nome}</Text>
                    <Text style={styles.txtTamanho}>Tamanho: {tamanho}</Text>
                    <Text style={styles.txtDescricao}>{descricao}</Text>
                    <Text style={styles.txtValor}>R$ {valor}</Text>
                </Card.Content>
                
                <View style={styles.barraBotoes}>
                    <Button 
                        mode="contained" 
                        onPress={Editar} 
                        buttonColor="#e58aaa" 
                        textColor="#8b3151"
                        style={styles.botaoAcao}
                    >
                        Editar
                    </Button>
                    
                    <Button 
                        mode="contained" 
                        onPress={Excluir} 
                        buttonColor="#ff4444" 
                        textColor="#ffffff"
                        style={styles.botaoAcao}
                    >
                        Excluir
                    </Button>
                </View>
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    containerCard: {
        marginBottom: 20,
        width: '100%',
        alignItems: 'center'
    },
    card: {
        width: '90%',
        padding: 15,
        backgroundColor: '#3d0c1e',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#8b3151',
        elevation: 4,
    },
    imagem: {
        height: 220,
        width: '100%',
        borderRadius: 12,
        backgroundColor: 'transparent'
    },
    conteudo: {
        alignItems: 'center',
        marginTop: 15,
    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#e58aaa',
        marginBottom: 6,
        textAlign: 'center'
    },
    txtTamanho: {
        fontSize: 14,
        color: '#ffb6ce',
        marginBottom: 4,
        fontWeight: '600'
    },
    txtDescricao: {
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        color: '#dfa2b7',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    txtValor: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 4
    },
    barraBotoes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
        width: '100%',
        gap: 10
    },
    botaoAcao: {
        flex: 1,
        borderRadius: 10,
    }
});