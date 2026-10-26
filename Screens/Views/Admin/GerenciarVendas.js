import { View, Text, StyleSheet, FlatList, Alert, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { IconButton, Button } from 'react-native-paper';
import { db as database } from '../../../Firebase/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { useTheme } from '../../../context/ThemeContext';
import { useState, useEffect } from "react";

// Nome amigável de cada status guardado no banco
const STATUS_LABEL = {
  aguardando_pagamento: 'Aguardando pagamento',
  aprovado: 'Pedido aprovado',
  em_preparo: 'Em preparação',
  em_preparacao: 'Em preparação', // pedidos antigos
  saiu_para_entrega: 'Saiu para entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Próximo passo de cada status (vira o botão principal do recibo)
const PROXIMO = {
  aprovado: { status: 'em_preparo', label: 'Iniciar preparo' },
  em_preparo: { status: 'saiu_para_entrega', label: 'Saiu para entrega' },
  em_preparacao: { status: 'saiu_para_entrega', label: 'Saiu para entrega' },
  saiu_para_entrega: { status: 'entregue', label: 'Marcar como Entregue' },
};

const FINAIS = ['entregue', 'cancelado'];

const pad = (n) => String(n).padStart(2, '0');

function formatarDataHoraISO(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function GerenciarVendas({ navigation }) {
  const { theme } = useTheme();
  const [vendas, setVendas] = useState([]);
  const [vendaSelecionadaId, setVendaSelecionadaId] = useState(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  // O recibo sempre mostra a versão mais recente do pedido
  const vendaSelecionada = vendas.find((v) => v.id === vendaSelecionadaId) || null;

  // Escuta os pedidos em tempo real: quando um cliente paga ou o status muda,
  // a lista atualiza sozinha.
  useEffect(() => {
    const q = query(collection(database, 'pedidos'), orderBy('createdAt', 'desc'));

    const cancelar = onSnapshot(
      q,
      (snapshot) => {
        setVendas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.log("Erro ao buscar vendas: ", error);
        Alert.alert("Erro", "Não foi possível carregar o histórico de vendas.");
      }
    );

    return () => cancelar();
  }, []);

  async function alterarStatusVenda(id, novoStatus) {
    if (!id) {
      Alert.alert("Erro", "Identificador de venda ausente.");
      return;
    }

    try {
      setAtualizando(true);

      await updateDoc(doc(database, 'pedidos', id), {
        status: novoStatus,
        atualizadoEm: serverTimestamp(),
        historico: arrayUnion({ status: novoStatus, em: new Date().toISOString() }),
      });
      // não precisa atualizar o estado local: o onSnapshot faz isso
    } catch (error) {
      console.log(error);
      Alert.alert("Erro", "Falha ao atualizar o status da venda no servidor.");
    } finally {
      setAtualizando(false);
    }
  }

  function confirmarCancelamento(id) {
    Alert.alert("Cancelar pedido", "Tem certeza que deseja cancelar este pedido?", [
      { text: "Não", style: "cancel" },
      { text: "Cancelar pedido", style: "destructive", onPress: () => alterarStatusVenda(id, 'cancelado') },
    ]);
  }

  function traduzirStatus(status) {
    if (!status) {
      return 'Pendente';
    }
    return STATUS_LABEL[String(status).toLowerCase()] || 'Pendente';
  }

  function obterEstiloStatus(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'entregue') {
      return styles.statusAprovado;
    }
    if (s === 'cancelado') {
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

  // Monta uma descrição legível a partir dos itens do pedido
  function descreverItens(itens) {
    if (!Array.isArray(itens) || itens.length === 0) {
      return "Pedido sem itens";
    }

    return itens
      .map((item) => item?.nome || item?.label || "Item")
      .filter(Boolean)
      .join(", ");
  }

  function abrirComprovante(venda) {
    if (venda) {
      setVendaSelecionadaId(venda.id);
      setModalVisivel(true);
    } else {
      Alert.alert("Erro", "Não foi possível abrir os detalhes desta venda.");
    }
  }

  const statusAtual = String(vendaSelecionada?.status || '').toLowerCase();
  const proximo = PROXIMO[statusAtual];
  const finalizado = FINAIS.includes(statusAtual);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.txt, { color: theme.primary }]}>Controle de Vendas</Text>

      <View style={styles.cardContainer}>
        <FlatList
          data={vendas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
          renderItem={({ item }) => {
            const nomeExibicao = descreverItens(item.itens);
            const endereco = item.endereco?.enderecoCompleto;

            return (
              <TouchableOpacity style={[styles.itemVenda, { borderBottomColor: theme.border }]} onPress={() => abrirComprovante(item)} activeOpacity={0.8}>
                <View style={styles.infoContainer}>
                  <Text style={[styles.txtProdutos, { color: theme.primary }]} numberOfLines={1}>
                    {nomeExibicao}
                  </Text>
                  <Text style={[styles.txtValor, { color: theme.text }]}>
                    Valor: {formatMoney(item.total)}
                  </Text>
                  <Text style={[styles.txtStatus, obterEstiloStatus(item.status)]}>
                    Status: {traduzirStatus(item.status)}
                  </Text>
                  {item.data ? (
                    <Text style={[styles.txtEndereco, { color: theme.text }]} numberOfLines={1}>
                      Entrega: {item.data}{item.horario ? ` às ${item.horario}` : ''}
                    </Text>
                  ) : null}
                  {endereco ? (
                    <Text style={[styles.txtEndereco, { color: theme.text }]} numberOfLines={1}>
                      Endereço: {endereco}
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

            <ScrollView style={styles.reciboScroll} contentContainerStyle={styles.reciboCorpo}>
              {vendaSelecionada ? (
                <>
                  <Text style={styles.reciboTextoLabel}>ID DO PEDIDO:</Text>
                  <Text style={styles.reciboTextoValor}>{vendaSelecionada.id}</Text>

                  {vendaSelecionada.clienteNome ? (
                    <>
                      <Text style={styles.reciboTextoLabel}>CLIENTE:</Text>
                      <Text style={styles.reciboTextoValor}>{vendaSelecionada.clienteNome}</Text>
                    </>
                  ) : null}

                  <Text style={styles.reciboTextoLabel}>ITENS:</Text>
                  <Text style={styles.reciboTextoValor}>
                    {descreverItens(vendaSelecionada.itens)}
                  </Text>

                  <Text style={styles.reciboTextoLabel}>MÉTODO DE PAGAMENTO:</Text>
                  <Text style={styles.reciboTextoValor}>
                    {vendaSelecionada.formaPagamento ? vendaSelecionada.formaPagamento.toUpperCase() : 'NÃO INFORMADO'}
                  </Text>

                  <Text style={styles.reciboTextoLabel}>ENTREGA (DATA / HORÁRIO):</Text>
                  <Text style={styles.reciboTextoValor}>
                    {vendaSelecionada.data || 'N/A'} {vendaSelecionada.horario ? `às ${vendaSelecionada.horario}` : ''}
                  </Text>

                  {vendaSelecionada.endereco?.enderecoCompleto ? (
                    <>
                      <Text style={styles.reciboTextoLabel}>ENDEREÇO DE ENTREGA:</Text>
                      <Text style={styles.reciboTextoValor}>{vendaSelecionada.endereco.enderecoCompleto}</Text>
                    </>
                  ) : null}

                  {Array.isArray(vendaSelecionada.historico) && vendaSelecionada.historico.length > 0 ? (
                    <>
                      <Text style={styles.reciboTextoLabel}>HISTÓRICO:</Text>
                      {vendaSelecionada.historico.map((h, i) => (
                        <Text key={i} style={styles.reciboHistorico}>
                          {formatarDataHoraISO(h.em)} — {traduzirStatus(h.status)}
                        </Text>
                      ))}
                    </>
                  ) : null}

                  <Text style={styles.reciboLinha}>-----------------------------------------</Text>

                  <Text style={styles.reciboTotalLabel}>TOTAL:</Text>
                  <Text style={styles.reciboTotalValor}>{formatMoney(vendaSelecionada.total)}</Text>

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

            {vendaSelecionada && !finalizado ? (
              <View style={styles.botoesModal}>
                {proximo ? (
                  <Button
                    mode="contained"
                    buttonColor="#E84890"
                    style={styles.btnAcao}
                    loading={atualizando}
                    disabled={atualizando}
                    onPress={() => alterarStatusVenda(vendaSelecionada.id, proximo.status)}
                  >
                    {proximo.label}
                  </Button>
                ) : (
                  <Text style={styles.aguardandoTexto}>Aguardando confirmação do pagamento</Text>
                )}
                <Button
                  mode="contained"
                  buttonColor="#C93678"
                  style={styles.btnAcao}
                  disabled={atualizando}
                  onPress={() => confirmarCancelamento(vendaSelecionada.id)}
                >
                  Cancelar
                </Button>
              </View>
            ) : null}

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
  reciboScroll: {
    maxHeight: 380,
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
  reciboHistorico: {
    fontSize: 12,
    color: '#202040',
    marginTop: 2,
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
    alignItems: 'center',
    marginVertical: 10,
  },
  btnAcao: {
    flex: 1,
    marginHorizontal: 5,
  },
  aguardandoTexto: {
    flex: 1,
    marginHorizontal: 5,
    fontSize: 12,
    color: '#6B6B85',
  },
  btnFechar: {
    marginTop: 5,
  },
});