import React, { useState, useCallback, useEffect, useMemo } from "react";
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput, LayoutAnimation,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { callFunction, acordarServidor } from "../Checkout/mercadopago";import { geocodificar, calcularTaxa } from "../Profile/taxaEntrega";

// ─────────────────────────────────────────────
// AGENDAMENTO DA ENTREGA — ajuste aqui conforme o funcionamento da loja
// ─────────────────────────────────────────────
const HORA_ABERTURA = 8;       // primeiro horário do dia (08:00)
const HORA_FECHAMENTO = 20;    // último horário do dia (20:00)
const INTERVALO_MIN = 30;      // de quantos em quantos minutos
const ANTECEDENCIA_MIN = 60;   // mínimo de minutos entre agora e a entrega
const DIAS_DISPONIVEIS = 7;    // quantos dias à frente o cliente pode escolher

const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const pad = (n) => String(n).padStart(2, "0");

function formatarData(d) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function gerarDias() {
  const hoje = new Date();
  return Array.from({ length: DIAS_DISPONIVEIS }, (_, i) =>
    new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i)
  );
}

function rotuloDia(d, i) {
  if (i === 0) return "Hoje";
  if (i === 1) return "Amanhã";
  return SEMANA[d.getDay()];
}

function gerarHorarios(dia) {
  const lista = [];
  const minimo = Date.now() + ANTECEDENCIA_MIN * 60000;

  for (let h = HORA_ABERTURA; h <= HORA_FECHAMENTO; h++) {
    for (let m = 0; m < 60; m += INTERVALO_MIN) {
      if (h === HORA_FECHAMENTO && m > 0) break;
      const dt = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h, m);
      lista.push({ texto: `${pad(h)}:${pad(m)}`, data: dt, disponivel: dt.getTime() >= minimo });
    }
  }
  return lista;
}

// Primeiro dia/horário que ainda dá para escolher (já vem pré-selecionado)
function slotInicial() {
  const dias = gerarDias();
  for (let i = 0; i < dias.length; i++) {
    const livre = gerarHorarios(dias[i]).find((h) => h.disponivel);
    if (livre) return { diaIdx: i, horario: livre.texto };
  }
  return { diaIdx: 0, horario: null };
}

// CPF: máscara e validação dos dígitos verificadores (o Pix do Mercado Pago exige CPF válido)
function mascararCpf(v) {
  const d = String(v).replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function cpfValido(v) {
  const c = String(v).replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) soma += Number(c[i]) * (t + 1 - i);
    const dv = ((soma * 10) % 11) % 10;
    if (dv !== Number(c[t])) return false;
  }
  return true;
}

function addressesCollection(uid) {
  return collection(db, "users", uid, "addresses");
}

// ─────────────────────────────────────────────
// PALETA "VIDA PARK"
// ─────────────────────────────────────────────
const COLORS = {
  azulVidaPark: "#202040",
  rosaVidaPark: "#E84890",
  branco: "#F8F8F8",
  rosaClaro: "#F7A8C8",
  azulSuave: "#34345C",
  rosaEscuro: "#C93678",
  textoSecundario: "#6B6B85",
  textoMutado: "#B3B3C6",
  bordaClara: "#EDEDF2",
};

const FORMAS_PAGAMENTO = [
  { id: "pix", label: "Pix", icon: "qr-code-outline" },
  { id: "credito", label: "Cartão de crédito", icon: "card-outline" },
  { id: "debito", label: "Cartão de débito", icon: "card-outline" },
];

function getFullAddress(addr) {
  if (!addr) return "";
  return [
    addr.street,
    addr.number,
    addr.complement,
    addr.neighborhood,
    addr.city,
    addr.state,
    addr.zipCode ? `CEP: ${addr.zipCode}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

// Soma a quantidade de itens do combo para gravar em "unidades".
// Se cada item já tiver um campo "quantidade", usa a soma; senão,
// conta 1 por item como fallback.
function contarUnidades(combo) {
  if (!Array.isArray(combo) || combo.length === 0) return 0;

  return combo.reduce((total, item) => {
    const quantidade = Number(item?.quantidade ?? item?.qtd ?? 1);
    return total + (Number.isFinite(quantidade) ? quantidade : 1);
  }, 0);
}

export default function Checkout({ navigation, route }) {
  // Dados que vieram do Carrinho
  const combo = route?.params?.combo || [];
  const totalCombo = route?.params?.totalCombo || 0;

  const [taxaEntrega, setTaxaEntrega] = useState(null);
  const [distanciaKm, setDistanciaKm] = useState(null);
  const [calculandoTaxa, setCalculandoTaxa] = useState(false);

  // Arredonda para 2 casas: a API de Pix do Mercado Pago é rígida com centavos
  const totalGeral = Math.round((totalCombo + (taxaEntrega || 0)) * 100) / 100;

  // Endereço vem do Firestore (users/{uid}/addresses),
  // priorizando o que está marcado como "selected" na tela Addresses.
  const [endereco, setEndereco] = useState(null);
  const [carregandoEndereco, setCarregandoEndereco] = useState(true);

  // Data e horário escolhidos pelo cliente
  const [inicial] = useState(slotInicial);
  const [diaIdx, setDiaIdx] = useState(inicial.diaIdx);
  const [horario, setHorario] = useState(inicial.horario);

  const dias = useMemo(() => gerarDias(), []);
  const diasInfo = useMemo(
    () => dias.map((d) => ({ data: d, temHorario: gerarHorarios(d).some((h) => h.disponivel) })),
    [dias]
  );
  const horarios = useMemo(() => gerarHorarios(dias[diaIdx]), [dias, diaIdx]);

  function selecionarDia(i) {
    setDiaIdx(i);
    const lista = gerarHorarios(dias[i]);
    const mantem = lista.find((h) => h.texto === horario && h.disponivel);
    setHorario(mantem ? mantem.texto : lista.find((h) => h.disponivel)?.texto || null);
  }

  // A área de data/horário fica recolhida (só mostra o resumo) e abre ao tocar
  const [agendaAberta, setAgendaAberta] = useState(!inicial.horario);

  function alternarAgenda() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAgendaAberta((v) => !v);
  }

  function escolherHorario(texto) {
    setHorario(texto);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAgendaAberta(false); // fecha ao escolher, para a tela ficar limpa
  }

  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);

  const [erroTaxa, setErroTaxa] = useState("");

  // Acorda o servidor de pagamento (o Render hiberna quando fica parado)
  useEffect(() => {
    acordarServidor();
  }, []);

  // 1) Carrega o endereço quando a tela ganha foco
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        try {
          setCarregandoEndereco(true);

          const uid = auth.currentUser?.uid;
          if (!uid) {
            if (ativo) setEndereco(null);
            return;
          }

          const snapshot = await getDocs(addressesCollection(uid));
          const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          const marcado = list.find((a) => a.selected) || list[0] || null;

          if (ativo) setEndereco(marcado);
        } catch (e) {
          console.log("Erro ao carregar endereço no Checkout:", e);
          if (ativo) setEndereco(null);
        } finally {
          if (ativo) setCarregandoEndereco(false);
        }
      }

      carregar();

      return () => {
        ativo = false;
      };
    }, [])
  );

  // 2) Calcula a taxa sempre que o endereço mudar
  useEffect(() => {
    let ativo = true;

    async function calcular() {
      console.log("TAXA: iniciou para", endereco?.street, endereco?.city);
      setTaxaEntrega(null);
      setDistanciaKm(null);
      setErroTaxa("");

      if (!endereco) return;

      setCalculandoTaxa(true);
      try {
        const coords =
          typeof endereco.latitude === "number" && typeof endereco.longitude === "number"
            ? { latitude: endereco.latitude, longitude: endereco.longitude }
            : await geocodificar(endereco);

        console.log("TAXA: coords", coords);

        if (!coords) {
          if (ativo) setErroTaxa("Não achei o endereço no mapa");
          return;
        }

        const { taxa, km } = await calcularTaxa(coords);
        console.log("TAXA: resultado", taxa, km);

        if (ativo) {
          setTaxaEntrega(Math.round(Number(taxa) * 100) / 100);
          setDistanciaKm(km);
        }
      } catch (e) {
        console.log("TAXA: ERRO", e);
        if (ativo) setErroTaxa(String(e?.message || e));
      } finally {
        if (ativo) setCalculandoTaxa(false);
      }
    }

    calcular();

    return () => {
      ativo = false;
    };
  }, [endereco]);

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0).toFixed(2).replace(".", ",")}`;
  }

  async function confirmarPedido() {
    if (!endereco) {
      Alert.alert(
        "Endereço necessário",
        "Adicione um endereço de entrega antes de confirmar o pedido.",
        [{ text: "Adicionar endereço", onPress: () => navigation.navigate("Addresses") }]
      );
      return;
    }

    if (taxaEntrega === null) {
      Alert.alert(
        "Taxa de entrega",
        "Não conseguimos calcular a taxa para este endereço. Confira o endereço e tente de novo."
      );
      return;
    }

    // Confere de novo o horário escolhido (o tempo pode ter passado enquanto o cliente decidia)
    const slot = horarios.find((h) => h.texto === horario);

    if (!slot) {
      Alert.alert("Horário necessário", "Escolha a data e o horário da entrega.");
      return;
    }

    if (slot.data.getTime() < Date.now() + ANTECEDENCIA_MIN * 60000) {
      Alert.alert(
        "Horário indisponível",
        "Esse horário não está mais disponível. Escolha outro para a entrega."
      );
      setHorario(null);
      return;
    }

    const uid = auth.currentUser?.uid;

    if (!uid) {
      Alert.alert(
        "Sessão necessária",
        "Faça login novamente para confirmar o pedido."
      );
      return;
    }

    if (formaPagamento === "pix" && !cpfValido(cpf)) {
      Alert.alert("CPF inválido", "Informe um CPF válido para gerar o Pix.");
      return;
    }

    setEnviando(true);

    try {
      const user = auth.currentUser;
      const email = user?.email || "cliente@email.com";
      const name = user?.displayName || "Cliente";
      const description = combo.map((item) => item.nome || "Produto").join(", ");

      const pedidoBase = {
        userId: uid,
        clienteNome: name,
        clienteEmail: email,
        itens: combo,
        unidades: contarUnidades(combo),
        totalCombo,
        taxaEntrega,
        total: totalGeral,
        // data e horário de ENTREGA escolhidos pelo cliente
        data: formatarData(slot.data),
        horario: slot.texto,
        entregaISO: slot.data.toISOString(),
        formaPagamento,
        endereco: {
          label: endereco.label || "Endereço",
          enderecoCompleto: getFullAddress(endereco),
        },
      };

      if (formaPagamento === "pix") {
        // Pix: gera o QR Code direto via createPayment (não usa o checkout
        // hospedado, que no sandbox não mostra a opção de Pix).
        console.log("PIX: enviando", { amount: totalGeral, email, taxaEntrega, totalCombo });

        const result = await callFunction("createPayment", {
          paymentMethod: "pix",
          amount: totalGeral,
          description,
          payerInfo: { name, email, cpf: cpf.replace(/\D/g, "") },
        });

        setEnviando(false);

        navigation.navigate("Pagamento", {
          pixData: {
            paymentId: result.payment.id,
            qrCode: result.payment.qrCode,
            qrCodeBase64: result.payment.qrCodeBase64,
            ticketUrl: result.payment.ticketUrl,
          },
          total: totalGeral,
          pedido: pedidoBase,
        });
        return;
      }

      // Cartão / débito: continua pelo checkout hospedado do Mercado Pago
      const result = await callFunction("createPreference", {
        amount: totalGeral,
        description,
        payerInfo: { name, email },
        address: getFullAddress(endereco),
      });

      setEnviando(false);

      // O pedido só é gravado no Firestore depois que o pagamento for
      // confirmado (isso acontece dentro da tela "Pagamento").
      navigation.navigate("Pagamento", {
        checkoutUrl: result.initPoint,
        externalRef: result.externalReference,
        total: totalGeral,
        pedido: pedidoBase,
      });
    } catch (error) {
      console.error("Erro ao criar preferência de pagamento:", error);

      setEnviando(false);

      Alert.alert(
        "Erro",
        error?.message || "Não foi possível iniciar o pagamento. Tente novamente."
      );
    }
  }

  const slotEscolhido = horarios.find((h) => h.texto === horario);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Endereço de entrega */}
        <View style={styles.card}>
          <View style={styles.cardTopo}>
            <Text style={styles.cardTitulo}>Endereço de entrega</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Addresses")}>
              <Text style={styles.alterarLink}>Alterar</Text>
            </TouchableOpacity>
          </View>

          {carregandoEndereco ? (
            <ActivityIndicator size="small" color={COLORS.rosaVidaPark} />
          ) : endereco ? (
            <View style={styles.enderecoLinha}>
              <Ionicons name="location-outline" size={18} color={COLORS.rosaVidaPark} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.enderecoRua}>{endereco.label || "Endereço"}</Text>
                <Text style={styles.enderecoBairro}>{getFullAddress(endereco)}</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.enderecoLinha}
              onPress={() => navigation.navigate("Addresses")}
            >
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.rosaVidaPark} />
              <Text style={[styles.enderecoBairro, { marginLeft: 8 }]}>
                Nenhum endereço cadastrado. Toque para adicionar.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Resumo */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Resumo</Text>

          <View style={styles.resumoLinha}>
            <Text style={styles.resumoLabel}>Combo</Text>
            <Text style={styles.resumoValor}>{formatarPreco(totalCombo)}</Text>
          </View>

          <View style={styles.resumoLinha}>
            <Text style={styles.resumoLabel}>
              Taxa de entrega
              {distanciaKm != null ? ` (${distanciaKm.toFixed(1).replace(".", ",")} km)` : ""}
            </Text>

            {calculandoTaxa ? (
              <ActivityIndicator size="small" color={COLORS.rosaVidaPark} />
            ) : (
              <Text style={styles.resumoValor}>
                {taxaEntrega === null
                  ? "Não calculada"
                  : taxaEntrega === 0
                  ? "Grátis"
                  : formatarPreco(taxaEntrega)}
              </Text>
            )}
          </View>
        </View>

        {/* Data e horário da entrega */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.agendaCabecalho}
            activeOpacity={0.8}
            onPress={alternarAgenda}
          >
            <Ionicons name="calendar-outline" size={20} color={COLORS.rosaVidaPark} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.agendaLabel}>Data e horário da entrega</Text>
              <Text style={styles.agendaValor}>
                {slotEscolhido
                  ? `${rotuloDia(dias[diaIdx], diaIdx)}, ${pad(dias[diaIdx].getDate())}/${pad(dias[diaIdx].getMonth() + 1)} às ${slotEscolhido.texto}`
                  : "Escolha o horário"}
              </Text>
            </View>
            <Ionicons
              name={agendaAberta ? "chevron-up" : "chevron-down"}
              size={20}
              color={COLORS.textoSecundario}
            />
          </TouchableOpacity>

          {agendaAberta && (
            <View style={styles.agendaCorpo}>
          <Text style={styles.subTitulo}>Dia</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.diasScroll}
          >
            {diasInfo.map((info, i) => {
              const ativo = diaIdx === i;
              return (
                <TouchableOpacity
                  key={i}
                  disabled={!info.temHorario}
                  onPress={() => selecionarDia(i)}
                  style={[
                    styles.diaChip,
                    ativo && styles.chipAtivo,
                    !info.temHorario && styles.chipDesabilitado,
                  ]}
                >
                  <Text style={[styles.diaChipLabel, ativo && styles.textoAtivo]}>
                    {rotuloDia(info.data, i)}
                  </Text>
                  <Text style={[styles.diaChipData, ativo && styles.textoAtivo]}>
                    {pad(info.data.getDate())}/{pad(info.data.getMonth() + 1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.subTitulo}>Horário</Text>
          <View style={styles.horariosGrid}>
            {horarios.map((h) => {
              const ativo = horario === h.texto;
              return (
                <TouchableOpacity
                  key={h.texto}
                  disabled={!h.disponivel}
                  onPress={() => escolherHorario(h.texto)}
                  style={[
                    styles.horarioChip,
                    ativo && styles.chipAtivo,
                    !h.disponivel && styles.chipDesabilitado,
                  ]}
                >
                  <Text style={[styles.horarioTexto, ativo && styles.textoAtivo]}>{h.texto}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

            </View>
          )}
        </View>

        {/* Forma de pagamento */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Forma de pagamento</Text>

          {FORMAS_PAGAMENTO.map((forma) => {
            const selecionada = formaPagamento === forma.id;
            return (
              <TouchableOpacity
                key={forma.id}
                style={styles.pagamentoLinha}
                onPress={() => setFormaPagamento(forma.id)}
              >
                <View style={styles.pagamentoEsquerda}>
                  <Ionicons name={forma.icon} size={18} color={COLORS.azulVidaPark} />
                  <Text style={styles.pagamentoLabel}>{forma.label}</Text>
                </View>
                <Ionicons
                  name={selecionada ? "checkmark-circle" : "ellipse-outline"}
                  size={20}
                  color={selecionada ? COLORS.rosaVidaPark : COLORS.textoMutado}
                />
              </TouchableOpacity>
            );
          })}

          {formaPagamento === "pix" && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.pagamentoLabel}>CPF do pagador</Text>
              <TextInput
                value={cpf}
                onChangeText={(v) => setCpf(mascararCpf(v))}
                placeholder="000.000.000-00"
                keyboardType="number-pad"
                maxLength={14}
                style={{
                  marginTop: 6,
                  borderWidth: 1,
                  borderColor: COLORS.bordaClara,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 15,
                  color: COLORS.azulVidaPark,
                }}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer fixo */}
      <View style={styles.footer}>
        <View style={styles.totalLinha}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValor}>{formatarPreco(totalGeral)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmarButton, (enviando || !horario) && { opacity: 0.7 }]}
          onPress={confirmarPedido}
          disabled={enviando || calculandoTaxa || !horario}
        >
          {enviando ? (
            <ActivityIndicator size="small" color={COLORS.branco} />
          ) : (
            <Text style={styles.confirmarButtonText}>CONFIRMAR PEDIDO</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branco,
  },
  resumoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  resumoLabel: { fontSize: 13, color: COLORS.textoSecundario },
  resumoValor: { fontSize: 13, fontWeight: "700", color: COLORS.azulVidaPark },

  // Header
  header: {
    backgroundColor: COLORS.azulVidaPark,
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: COLORS.branco,
    fontSize: 17,
    fontWeight: "700",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
    marginBottom: 4,
  },
  alterarLink: {
    fontSize: 12,
    color: COLORS.rosaVidaPark,
    fontWeight: "700",
  },

  // Endereço
  enderecoLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  enderecoRua: {
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },
  enderecoBairro: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },

  // Data e horário
  subTitulo: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    fontWeight: "600",
    marginTop: 10,
  },
  diasScroll: {
    marginTop: 8,
  },
  diaChip: {
    borderWidth: 1,
    borderColor: COLORS.bordaClara,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    alignItems: "center",
  },
  diaChipLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.azulVidaPark,
  },
  diaChipData: {
    fontSize: 11,
    color: COLORS.textoSecundario,
    marginTop: 2,
  },
  horariosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  horarioChip: {
    borderWidth: 1,
    borderColor: COLORS.bordaClara,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  horarioTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.azulVidaPark,
  },
  chipAtivo: {
    backgroundColor: COLORS.rosaVidaPark,
    borderColor: COLORS.rosaVidaPark,
  },
  chipDesabilitado: {
    opacity: 0.35,
  },
  textoAtivo: {
    color: COLORS.branco,
  },
  entregaResumo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  entregaResumoTexto: {
    fontSize: 13,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },

  // Cabeçalho recolhível de data/horário
  agendaCabecalho: {
    flexDirection: "row",
    alignItems: "center",
  },
  agendaLabel: {
    fontSize: 12,
    color: COLORS.textoSecundario,
    fontWeight: "600",
  },
  agendaValor: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "700",
    marginTop: 2,
  },
  agendaCorpo: {
    marginTop: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.bordaClara,
  },

  // Forma de pagamento
  pagamentoLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bordaClara,
  },
  pagamentoEsquerda: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pagamentoLabel: {
    fontSize: 14,
    color: COLORS.azulVidaPark,
    fontWeight: "600",
  },

  // Footer
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.bordaClara,
    backgroundColor: COLORS.branco,
  },
  totalLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.azulVidaPark,
    fontWeight: "700",
  },
  totalValor: {
    fontSize: 17,
    color: COLORS.azulVidaPark,
    fontWeight: "800",
  },
  confirmarButton: {
    backgroundColor: COLORS.rosaVidaPark,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmarButtonText: {
    color: COLORS.branco,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});