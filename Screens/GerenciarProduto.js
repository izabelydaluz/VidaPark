import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { Button, IconButton } from "react-native-paper";
import { database } from '../firebaseConfig';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import CardProduct from '../components/CardProduct';

export default function GerenciarProduto({ navigation }) {
  const [produtos, setProdutos] = useState([]);

  async function carregarProduto() {
    try {
      const querySnapshot = await getDocs(collection(database, 'produtos'));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setProdutos(lista);
    } catch (error) {
      console.log("Erro ao buscar produtos: ", error);
    }
  }

  useEffect(() => {
    carregarProduto();
  }, []);

  async function ExcluirProdutos(id) {
    try {
      await deleteDoc(doc(database, 'produtos', id));
      setProdutos(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      Alert.alert('error, não foi possível deletar o produto');
      console.log(error);
    }
  }

  function EditarProdutos(produto) {
    navigation.navigate('EditProduct', { produto, aoSalvar: carregarProduto });
  }

  function AdicionarProdutos() {
    navigation.navigate('AddProdutos', { aoSalvar: carregarProduto });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.txt}>Gerenciamento de Produtos</Text>
      
      <Button 
        style={styles.button} 
        buttonColor="#E84890" 
        textColor="#F8F8F8" 
        mode='contained' 
        onPress={AdicionarProdutos}
      >
        Adicionar Produto
      </Button>

      <View style={styles.cardContainer}>
        <FlatList
          data={produtos}
          renderItem={({ item }) => (
            <CardProduct
              nome={item.nome}
              valor={item.valor}
              imagem={item.imagem}
              tamanho={item.tamanho}
              descricao={item.descricao}
              Excluir={() => ExcluirProdutos(item.id)}
              Editar={() => EditarProdutos(item)}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.vazioContainer}>
              <IconButton
                icon="package-variant-closed-remove"
                iconColor="#E84890"
                size={80}
                style={styles.iconeVazio}
              />
              <Text style={styles.txtVazio}>Não existem produtos cadastrados</Text>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  txt: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#E84890',
    textAlign: 'center',
    marginBottom: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
  },
  container: {
    flex: 1,
    backgroundColor: '#202040',
    paddingTop: 40,
  },
  button: {
    marginHorizontal: 50,
    marginBottom: 20,
  },
  cardContainer: {
    flex: 1,
    width: '100%',
  },
  vazioContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  iconeVazio: {
    marginBottom: 10,
    opacity: 0.8,
  },
  txtVazio: {
    fontSize: 18,
    color: '#F7A8C8',
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  }
});