import React, { useEffect, useState } from "react";
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { db  } from '../../../Firebase/firebaseConfig';
import { doc, onSnapshot } from "firebase/firestore";

// ─────────────────────────────────────────────
// PALETA "VIDA PARK"
// ─────────────────────────────────────────────
const COLORS = {
  azulVidaPark: "#202040",
  rosaVidaPark: "#E84890",
  branco: "#F8F8F8",
  rosaClaro: "#F7A8C8",
  textoSecundario: "#6B6B85",
  textoMutado: "#B3B3C6",
  bordaClara: "#EDEDF2",
  verdeSucesso: "#2E9E5B",
  verdeFundo: "#E4F5EA",
  laranjaAviso: "#D98A1F",
  laranjaFundo: "#FCEFD9",
  vermelho: "#C0392B",
  vermelhoFundo: "#FBE3E1",
};

// Status do pedido (mesmos nomes usados na tela de Controle de Vendas)
const STATUS_INFO = {
  aguardando_pagamento: { label: "Aguardando pagamento", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, etapa: -1 },
  aprovado: { label: "Pedido aprovado", cor: COLORS.verdeSucesso, fundo: COLORS.verdeFundo, etapa: 0 },
  em_preparo: { label: "Em preparação", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, etapa: 1 },
  em_preparacao: { label: "Em preparação", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, etapa: 1 },
  saiu_para_entrega: { label: "Saiu para entrega", cor: COLORS.laranjaAviso, fundo: COLORS.laranjaFundo, etapa: 2 },
  entregue: { label: "Entregue", cor: COLORS.verdeSucesso, fundo: COLORS.verdeFundo, etapa: 3 },
  cancelado: { label: "Cancelado", cor: COLORS.vermelho, fundo: COLORS.vermelhoFundo, etapa: -2 },
};

// Etapas da linha do tempo
const ETAPAS = [
  { label: "Pagamento aprovado", icone: "checkmark-circle-outline" },
  { label: "Em preparação", icone: "restaurant-outline" },
  { label: "Saiu para entrega", icone: "bicycle-outline" },
  { label: "Entregue", icone: "home-outline" },
];

const pad = (n) => String(n).padStart(2, "0");

function formatarDataHoraISO(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatarPreco(valor) {
  return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
}

function infoDoStatus(status) {
  return (
    STATUS_INFO[String(status || "").toLowerCase()] || {
      label: status || "Pendente",
      cor: COLORS.textoSecundario,
      fundo: COLORS.bordaClara,
      etapa: -1,
    }
  );
}

// Descobre a data em que cada status aconteceu, a partir do histórico
function dataDoStatus(historico, nomes) {
  if (!Array.isArray(historico)) return null;
  const registro = [...historico].reverse().find((h) => nomes.includes(h.status));
  return registro ? formatarDataHoraISO(registro.em) : null;
}

export default function PedidoDetalhes({ navigation, route }) {
  const pedidoParam = route?.params?.pedido;
  const pedidoId = pedidoParam?.id;

  // Começa com o que veio da lista e completa com o documento do Firestore
  const [pedido, setPedido] = useState(pedidoParam || null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!pedidoId) {
      setCarregando(false);
      setErro(true);
      return;
    }

    // Tempo real: se o status mudar, a tela atualiza sozinha
    const cancelar = onSnapshot(
      doc(db, "pedidos", pedidoId),
      (snap) => {
        if (snap.exists()) {
          setPedido({ id: snap.id, ...snap.data() });
          setErro(false);
        } else {
          setErro(true);
        }
        setCarregando(false);
      },
      (error) => {
        console.log("Erro ao carregar detalhes do pedido:", error);
        setErro(true);
        setCarregando(false);
      }
    );

    return () => cancelar();
  }, [pedidoId]);

  const voltar = () => navigation.goBack();

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={voltar} style={styles.btnVoltar} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chevron-back" size={24} color={COLORS.branco} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Detalhes do pedido</Text>
    </View>
  );

  if (carregando && !pedido) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centro}>
          <ActivityIndicator size="large" color={COLORS.rosaVidaPark} />
        </View>
      </View>
    );
  }

  if (erro || !pedido) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.centro}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textoMutado} />
          <Text style={styles.textoVazio}>Não foi possível carregar este pedido</Text>
        </View>
      </View>
    );
  }

  const status = infoDoStatus(pedido.status);
  const cancelado = String(pedido.status || "").toLowerCase() === "cancelado";
  const itens = Array.isArray(pedido.itens) ? pedido.itens : [];
  const endereco = pedido.endereco?.enderecoCompleto;
  const taxaEntrega = Number(pedido.taxaEntrega || 0);

  // Data de cada etapa, quando existir no histórico
  const datasEtapas = [
    dataDoStatus(pedido.historico, ["aprovado"]),
    dataDoStatus(pedido.historico, ["em_preparo", "em_preparacao"]),
    dataDoStatus(pedido.historico, ["saiu_para_entrega"]),
    dataDoStatus(pedido.historico, ["entregue"]),
  ];

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Resumo */}
        <View style={styles.card}>
          <View style={styles.linhaTopo}>
            <Text style={styles.pedidoNumero} numberOfLines={1}>
              Pedido #{pedido.id}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: status.fundo }]}>
            <Text style={[styles.statusTexto, { color: status.cor }]}>{status.label}</Text>
          </View>

          {pedido.clienteNome ? (
            <Text style={styles.textoSecundario}>Cliente: {pedido.clienteNome}</Text>
          ) : null}
        </View>

        {/* Acompanhamento */}
        <Text style={styles.secaoTitulo}>Acompanhamento</Text>
        <View style={styles.card}>
          {cancelado ? (
            <View style={styles.avisoCancelado}>
              <Ionicons name="close-circle-outline" size={22} color={COLORS.vermelho} />
              <Text style={styles.avisoCanceladoTexto}>Este pedido foi cancelado.</Text>
            </View>
          ) : (
            ETAPAS.map((etapa, i) => {
              const ultima = i === ETAPAS.length - 1;
              // etapa do status: aprovado=0, preparo=1, saiu=2, entregue=3
              const feito = status.etapa >= i;
              return (
                <View key={etapa.label} style={styles.etapaLinha}>
                  <View style={styles.etapaColunaIcone}>
                    <View
                      style={[
                        styles.etapaIcone,
                        { backgroundColor: feito ? COLORS.rosaVidaPark : COLORS.bordaClara },
                      ]}
                    >
                      <Ionicons
                        name={etapa.icone}
                        size={16}
                        color={feito ? "#FFFFFF" : COLORS.textoMutado}
                      />
                    </View>
                    {!ultima && (
                      <View
                        style={[
                          styles.etapaConector,
                          { backgroundColor: status.etapa > i ? COLORS.rosaVidaPark : COLORS.bordaClara },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.etapaTextos}>
                    <Text style={[styles.etapaLabel, { color: feito ? COLORS.azulVidaPark : COLORS.textoMutado }]}>
                      {etapa.label}
                    </Text>
                    {datasEtapas[i] ? <Text style={styles.etapaData}>{datasEtapas[i]}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Itens */}
        <Text style={styles.secaoTitulo}>Itens do pedido</Text>
        <View style={styles.card}>
          {itens.length === 0 ? (
            <Text style={styles.textoSecundario}>
              {pedido.unidades ? `${pedido.unidades} unidades` : "Pedido sem itens"}
            </Text>
          ) : (
            itens.map((item, i) => {
              const nome = item?.nome || item?.label || "Item";
              const qtd = item?.quantidade ?? item?.qtd ?? item?.qty;
              const preco = item?.preco ?? item?.valor ?? item?.precoUnitario;

              return (
                <View
                  key={`${nome}-${i}`}
                  style={[styles.itemLinha, i < itens.length - 1 && styles.itemLinhaBorda]}
                >
                  <Text style={styles.itemNome} numberOfLines={2}>
                    {qtd ? `${qtd}x ` : ""}
                    {nome}
                  </Text>
                  {typeof preco === "number" ? (
                    <Text style={styles.itemPreco}>{formatarPreco(preco)}</Text>
                  ) : null}
                </View>
              );
            })
          )}

          {pedido.unidades ? (
            <Text style={[styles.textoSecundario, { marginTop: 10 }]}>{pedido.unidades} unidades no total</Text>
          ) : null}
        </View>

        {/* Entrega */}
        <Text style={styles.secaoTitulo}>Entrega</Text>
        <View style={styles.card}>
          <View style={styles.infoLinha}>
            <Ionicons name="calendar-outline" size={18} color={COLORS.rosaVidaPark} />
            <Text style={styles.infoTexto}>
              {pedido.data || "Data não informada"}
              {pedido.horario ? ` às ${pedido.horario}` : ""}
            </Text>
          </View>

          {endereco ? (
            <View style={[styles.infoLinha, { marginTop: 12, alignItems: "flex-start" }]}>
              <Ionicons name="location-outline" size={18} color={COLORS.rosaVidaPark} />
              <Text style={styles.infoTexto}>{endereco}</Text>
            </View>
          ) : null}
        </View>

        {/* Pagamento */}
        <Text style={styles.secaoTitulo}>Pagamento</Text>
        <View style={styles.card}>
          <View style={styles.infoLinha}>
            <Ionicons name="card-outline" size={18} color={COLORS.rosaVidaPark} />
            <Text style={styles.infoTexto}>
              {pedido.formaPagamento ? String(pedido.formaPagamento).toUpperCase() : "Não informado"}
            </Text>
          </View>

          {taxaEntrega > 0 ? (
            <View style={styles.totalLinha}>
              <Text style={styles.textoSecundario}>Taxa de entrega</Text>
              <Text style={styles.textoSecundario}>{formatarPreco(taxaEntrega)}</Text>
            </View>
          ) : null}

          <View style={[styles.totalLinha, taxaEntrega > 0 && { marginTop: 6 }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>{formatarPreco(pedido.total)}</Text>
          </View>
        </View>

        {/* Avaliar */}
        {String(pedido.status).toLowerCase() === "entregue" ? (
          <TouchableOpacity
            style={styles.btnAvaliar}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("AvaliarPedido", { pedido })}
          >
            <Ionicons name="star-outline" size={18} color="#FFFFFF" />
            <Text style={styles.btnAvaliarTexto}>Avaliar pedido</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branco,
  },

  // Header
  header: {
    backgroundColor: COLORS.azulVidaPark,
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },
  btnVoltar: {
    marginRight: 8,
  },
  headerTitle: {
    color: COLORS.branco,
    fontSize: 19,
    fontWeight: "700",
  },

  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  textoVazio: {
    color: COLORS.textoMutado,
    fontSize: 14,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textoSecundario,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 22,
    marginBottom: 10,
    marginLeft: 4,
  },

  // Resumo
  linhaTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pedidoNumero: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
    flex: 1,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 6,
  },
  statusTexto: {
    fontSize: 12,
    fontWeight: "700",
  },
  textoSecundario: {
    fontSize: 13,
    color: COLORS.textoSecundario,
  },

  // Linha do tempo
  etapaLinha: {
    flexDirection: "row",
    minHeight: 52,
  },
  etapaColunaIcone: {
    alignItems: "center",
    width: 32,
  },
  etapaIcone: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  etapaConector: {
    flex: 1,
    width: 3,
    borderRadius: 2,
    marginVertical: 2,
  },
  etapaTextos: {
    marginLeft: 12,
    paddingTop: 6,
    flex: 1,
  },
  etapaLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  etapaData: {
    fontSize: 11,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },
  avisoCancelado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avisoCanceladoTexto: {
    color: COLORS.vermelho,
    fontWeight: "700",
    fontSize: 14,
  },

  // Itens
  itemLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  itemLinhaBorda: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordaClara,
  },
  itemNome: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.azulVidaPark,
    paddingRight: 10,
  },
  itemPreco: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },

  // Entrega / pagamento
  infoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoTexto: {
    flex: 1,
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "500",
  },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.azulVidaPark,
  },
  totalValor: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.rosaVidaPark,
  },

  // Avaliar
  btnAvaliar: {
    marginTop: 24,
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnAvaliarTexto: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
});