import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton, Button } from 'react-native-paper';
import { database } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

export default function GerenciarVendas({ navigation }) {
  const { theme } = useTheme();
  const [vendas, setVendas] = useState([]);
  const [vendaSelecionada, setVendaSelecionada] = useState(null);
  const [modalVisivel, setModalVisivel] = useState(false);

  async function carregarVendas() {
    try {
      const querySnapshot = await getDocs(collection(database, 'payments'));
      const lista = [];
      querySnapshot.forEach((doc) => {
        lista.push({ id: doc.id, ...doc.data() });
      });
      setVendas(lista);
    } catch (error) {
      console.log("Erro ao buscar vendas: ", error);
      Alert.alert("Erro", "Não foi possível carregar o histórico de vendas.");
    }
  }

  useEffect(() => {
    carregarVendas();
  }, []);

  async function alterarStatusVenda(id, novoStatus) {
    if (!id) {
      Alert.alert("Erro", "Identificador de venda ausente.");
      return;
    }

    try {
      const vendaRef = doc(database, 'payments', id);
      await updateDoc(vendaRef, { status: novoStatus });

      setVendas((prev) =>
        prev.map((venda) => {
          if (venda.id === id) {
            return { ...venda, status: novoStatus };
          } else {
            return venda;
          }
        })
      );
      
      if (vendaSelecionada) {
        if (vendaSelecionada.id === id) {
          setVendaSelecionada({ ...vendaSelecionada, status: novoStatus });
        }
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Falha ao atualizar o status da venda no servidor.");
    }
  }

  function traduzirStatus(status) {
    if (!status) {
      return 'Pendente';
    }
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'approved' || statusLower === 'aprovado') {
      return 'Aprovado';
    }
    if (statusLower === 'cancelled' || statusLower === 'cancelado' || statusLower === 'rejected' || statusLower === 'recusado') {
      return 'Cancelado';
    }
    
    return 'Pendente';
  }

  function obterEstiloStatus(status) {
    const statusTraduzido = traduzirStatus(status);
    if (statusTraduzido === 'Aprovado') {
      return styles.statusAprovado;
    }
    if (statusTraduzido === 'Cancelado') {
      return styles.statusRecusado;
    }
    return styles.statusPendente;
  }

  function formatMoney(value) {
    if (typeof value !== 'number') {
      return value;
    }
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }

  function abrirComprovante(venda) {
    if (venda) {
      setVendaSelecionada(venda);
      setModalVisivel(true);
    } else {
      Alert.alert("Erro", "Não foi possível abrir os detalhes desta venda.");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.txt, { color: theme.primary }]}>Controle de Vendas</Text>

      <View style={styles.cardContainer}>
        <FlatList
          data={vendas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          renderItem={({ item }) => {
            let nomeExibicao = "";
            if (item.description) {
              nomeExibicao = item.description;
            } else {
              nomeExibicao = "Produto Sem Nome";
            }

            return (
              <TouchableOpacity style={[styles.itemVenda, { borderBottomColor: theme.border }]} onPress={() => abrirComprovante(item)} activeOpacity={0.8}>
                <View style={styles.infoContainer}>
                  <Text style={[styles.txtProdutos, { color: theme.primary }]} numberOfLines={1}>
                    {nomeExibicao}
                  </Text>
                  <Text style={[styles.txtValor, { color: theme.text }]}>
                    Valor: {formatMoney(item.amount)}
                  </Text>
                  <Text style={[styles.txtStatus, obterEstiloStatus(item.status)]}>
                    Status: {traduzirStatus(item.status)}
                  </Text>
                  {item.address ? (
                    <Text style={[styles.txtEndereco, { color: theme.text }]} numberOfLines={1}>
                      Endereço: {item.address}
                    </Text>
                  ) : null}
                </View>
                <IconButton icon="receipt" iconColor={theme.primary} size={24} />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.vazioContainer}>
              <IconButton icon="cash-register" iconColor={theme.primary} size={80} style={styles.iconeVazio} />
              <Text style={[styles.txtVazio, { color: theme.primary }]}>Nenhuma venda registrada ainda</Text>
            </View>
          }
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisivel}
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.reciboContainer}>
            <View style={styles.reciboTopo}>
              <Text style={styles.reciboTitulo}>COMPROVANTE DE VENDA</Text>
              <Text style={styles.reciboLinha}>-----------------------------------------</Text>
            </View>

            <ScrollView contentContainerStyle={styles.reciboCorpo}>
              {vendaSelecionada ? (
                <>
                  <Text style={styles.reciboTextoLabel}>ID DO PRODUTO / DOCUMENTO:</Text>
                  <Text style={styles.reciboTextoValor}>{vendaSelecionada.id}</Text>

                  <Text style={styles.reciboTextoLabel}>DESCRIÇÃO:</Text>
                  <Text style={styles.reciboTextoValor}>
                    {vendaSelecionada.description ? vendaSelecionada.description : 'Não informada'}
                  </Text>

                  <Text style={styles.reciboTextoLabel}>MÉTODO DE PAGAMENTO:</Text>
                  <Text style={styles.reciboTextoValor}>
                    {vendaSelecionada.paymentMethod ? vendaSelecionada.paymentMethod.toUpperCase() : 'PIX / CARTÃO'}
                  </Text>

                  <Text style={styles.reciboTextoLabel}>ID MERCADO PAGO:</Text>
                  <Text style={styles.reciboTextoValor}>
                    {vendaSelecionada.mpId ? vendaSelecionada.mpId : 'N/A'}
                  </Text>

                  {vendaSelecionada.address ? (
                    <>
                      <Text style={styles.reciboTextoLabel}>ENDEREÇO DE ENTREGA:</Text>
                      <Text style={styles.reciboTextoValor}>{vendaSelecionada.address}</Text>
                    </>
                  ) : null}
                  
                  <Text style={styles.reciboLinha}>-----------------------------------------</Text>

                  <Text style={styles.reciboTotalLabel}>TOTAL:</Text>
                  <Text style={styles.reciboTotalValor}>{formatMoney(vendaSelecionada.amount)}</Text>
                  
                  <Text style={styles.reciboTotalLabel}>STATUS ATUAL:</Text>
                  <Text style={[styles.reciboStatus, obterEstiloStatus(vendaSelecionada.status)]}>
                    {traduzirStatus(vendaSelecionada.status).toUpperCase()}
                  </Text>
                </>
              ) : (
                <Text style={styles.reciboTextoValor}>Nenhuma venda selecionada</Text>
              )}
            </ScrollView>

            <Text style={styles.reciboLinha}>-----------------------------------------</Text>
            
            <View style={styles.botoesModal}>
              <Button 
                mode="contained" 
                buttonColor="#E84890" 
                style={styles.btnAcao}
                onPress={() => {
                  if (vendaSelecionada) {
                    alterarStatusVenda(vendaSelecionada.id, 'aprovado');
                  }
                }}
              >
                Aprovar
              </Button>
              <Button 
                mode="contained" 
                buttonColor="#C93678" 
                style={styles.btnAcao}
                onPress={() => {
                  if (vendaSelecionada) {
                    alterarStatusVenda(vendaSelecionada.id, 'cancelado');
                  }
                }}
              >
                Cancelar
              </Button>
            </View>

            <Button 
              mode="outlined" 
              textColor={theme.primary} 
              style={[styles.btnFechar, { borderColor: theme.primary }]}
              onPress={() => setModalVisivel(false)}
            >
              Fechar Recibo
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  txt: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 50,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 2,
    
    
  },
  container: {
    flex: 1,
    paddingTop: 40,
    
  },
  cardContainer: {
    flex: 1,
    width: '100%',
  },
  itemVenda: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    paddingVertical: 16,
  },
  infoContainer: {
    flex: 1,
    marginRight: 10,
  },
  txtProdutos: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  txtValor: {
    fontSize: 15,
    marginTop: 4,
    fontWeight: '600',
  },
  txtStatus: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: 'bold',
  },
  txtEndereco: {
    fontSize: 12,
    marginTop: 3,
    fontStyle: 'italic',
  },
  statusAprovado: {
    color: '#E84890',
  },
  statusPendente: {
    color: '#F7A8C8',
  },
  statusRecusado: {
    color: '#C93678',
  },
  vazioContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  iconeVazio: {
    marginBottom: 10,
    opacity: 0.8,
  },
  txtVazio: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(32, 32, 64, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reciboContainer: {
    width: '85%',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#202040',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  reciboTopo: {
    alignItems: 'center',
  },
  reciboTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202040',
    letterSpacing: 1,
  },
  reciboLinha: {
    color: '#6B6B85',
    letterSpacing: 2,
    marginVertical: 5,
    textAlign: 'center',
  },
  reciboCorpo: {
    paddingVertical: 10,
  },
  reciboTextoLabel: {
    fontSize: 11,
    color: '#6B6B85',
    fontWeight: 'bold',
    marginTop: 10,
  },
  reciboTextoValor: {
    fontSize: 14,
    color: '#202040',
    fontWeight: '500',
  },
  reciboTotalLabel: {
    fontSize: 13,
    color: '#202040',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  reciboTotalValor: {
    fontSize: 24,
    color: '#E84890',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  reciboStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  botoesModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  btnAcao: {
    flex: 1,
    marginHorizontal: 5,
  },
  btnFechar: {
    marginTop: 5,
  }
});