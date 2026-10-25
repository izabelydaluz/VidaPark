import React, { useState, useCallback } from "react";
import {View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { auth, db } from "../../../Firebase/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { callFunction } from "../Checkout/mercadopago";
import { geocodificar, calcularTaxa } from "../Profile/taxaEntrega";
import  { useEffect } from "react";

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

  const totalGeral = totalCombo + (taxaEntrega || 0);   

 

  // Endereço vem do Firestore (users/{uid}/addresses),
  // priorizando o que está marcado como "selected" na tela Addresses.
  const [endereco, setEndereco] = useState(null);
  const [carregandoEndereco, setCarregandoEndereco] = useState(true);

  const [data] = useState("25/05/2025");
  const [horario] = useState("18:00");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [cpf, setCpf] = useState("");
  const [enviando, setEnviando] = useState(false);




  const [erroTaxa, setErroTaxa] = useState("");

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
        setTaxaEntrega(taxa);
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
      if (taxaEntrega === null) {
  Alert.alert(
    "Taxa de entrega",
    "Não conseguimos calcular a taxa para este endereço. Confira o endereço e tente de novo."
  );
  return;
}
      Alert.alert(
        "Endereço necessário",
        "Adicione um endereço de entrega antes de confirmar o pedido.",
        [{ text: "Adicionar endereço", onPress: () => navigation.navigate("Addresses") }]
      );
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
        itens: combo,
        unidades: contarUnidades(combo),
        totalCombo,
        taxaEntrega,
        total: totalGeral,
        data,
        horario,
        formaPagamento,
        endereco: {
          label: endereco.label || "Endereço",
          enderecoCompleto: getFullAddress(endereco),
        },
      };

      if (formaPagamento === "pix") {
        // Pix: gera o QR Code direto via createPayment (não usa o checkout
        // hospedado, que no sandbox não mostra a opção de Pix).
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
        {/* Data e horário */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Data e horário</Text>
          <View style={styles.dataLinha}>
            <View style={styles.dataItem}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textoSecundario} />
              <Text style={styles.dataTexto}>{data}</Text>
            </View>
            <View style={styles.dataItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textoSecundario} />
              <Text style={styles.dataTexto}>{horario}</Text>
            </View>
          </View>
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
          style={[styles.confirmarButton, enviando && { opacity: 0.7 }]}
          onPress={confirmarPedido}
          disabled={enviando || calculandoTaxa}
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
  dataLinha: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  dataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataTexto: {
    fontSize: 13,
    color: COLORS.textoSecundario,
    fontWeight: "600",
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