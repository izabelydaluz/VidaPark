import React, { useState, useMemo, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, TextInput,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { database } from "../firebaseConfig";
import { useTheme } from "../context/ThemeContext";

export default function MonteSeuCombo({ route, navigation }) {
  const { theme } = useTheme();

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantidades, setQuantidades] = useState({});

  const { tamanho, limite } = route?.params || {};

  async function carregarSalgados() {
    try {
      setLoading(true);

      const querySnapshot = await getDocs(
        collection(database, "salgados")
      );

      const lista = [];

      querySnapshot.forEach((doc) => {
        lista.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setProdutos(lista);
    } catch (error) {
      console.log("Erro ao carregar salgados:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarSalgados();
  }, []);


  function alterarQuantidade(produtoId, delta) {
    setQuantidades((prev) => {
      const atual = prev[produtoId] || 0;

      const totalAtual = Object.values(prev).reduce(
        (soma, qtd) => soma + qtd,
        0
      );
      if (
        delta > 0 &&
        limite &&
        totalAtual >= limite
      ) {
        Alert.alert(
          "Limite atingido",
          `O Combo ${tamanho} permite até ${limite} salgados.`
        );

        return prev;
      }

      const nova = Math.max(0, atual + delta);

      return {
        ...prev,
        [produtoId]: nova,
      };
    });
  }

  function definirQuantidade(produtoId, textoDigitado) {
    if (textoDigitado === "") {
      setQuantidades((prev) => ({
        ...prev,
        [produtoId]: 0,
      }));

      return;
    }

    const somenteNumeros = textoDigitado.replace(
      /[^0-9]/g,
      ""
    );

    const valor = parseInt(somenteNumeros, 10);

    setQuantidades((prev) => {
      const totalSemProduto = Object.entries(prev).reduce(
        (soma, [id, qtd]) => {
          if (id === produtoId) return soma;

          return soma + qtd;
        },
        0
      );

      const quantidadeDisponivel =
        (limite || 0) - totalSemProduto;

      const quantidadeFinal = Math.min(
        isNaN(valor) ? 0 : Math.max(0, valor),
        Math.max(0, quantidadeDisponivel)
      );

      return {
        ...prev,
        [produtoId]: quantidadeFinal,
      };
    });
  }

  function precoUnitario(item) {
    const valor =
      item.preco ?? item.valor ?? 0;

    return typeof valor === "string"
      ? parseFloat(valor.replace(",", "."))
      : Number(valor);
  }

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0)
      .toFixed(2)
      .replace(".", ",")}`;
  }

  const totalUnidades = useMemo(
    () =>
      Object.values(quantidades).reduce(
        (soma, qtd) => soma + qtd,
        0
      ),
    [quantidades]
  );

  const totalValor = useMemo(() => {
    return produtos.reduce((soma, item) => {
      const qtd = quantidades[item.id] || 0;

      return (
        soma +
        qtd * precoUnitario(item)
      );
    }, 0);
  }, [produtos, quantidades]);



  const progresso = limite
    ? Math.min(totalUnidades / limite, 1)
    : 0;

  const atingiuLimite = limite
    ? totalUnidades >= limite
    : false;

  function adicionarAoCarrinho() {
    if (totalUnidades === 0) {
      Alert.alert(
        "Combo vazio",
        "Escolha pelo menos um salgado para continuar."
      );

      return;
    }

    const itensSelecionados = produtos
      .filter(
        (item) =>
          (quantidades[item.id] || 0) > 0
      )
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        quantidade: quantidades[item.id],
        precoUnitario: precoUnitario(item),
      }));

    navigation.navigate("Carrinho", {
      combo: itensSelecionados,
      tamanho: tamanho,
      limite: limite,
      total: totalValor,
    });
  }


  return (
    <View style={[ styles.container, {   backgroundColor: theme.background, }, ]}>
      <View style={[  styles.header, { backgroundColor: theme.primary, }, ]} >
        <TouchableOpacity  onPress={() => navigation.goBack()}  style={styles.iconButton} >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <Text style={[ styles.headerTitle, {  color: theme.surface, }, ]} >  Monte seu combo </Text>
         <TouchableOpacity style={styles.iconButton} onPress={() =>
            Alert.alert(
              "Monte seu combo",
              `Escolha os sabores que quiser até atingir o limite de ${limite} unidades.`
            )
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>
      </View>

  
      <View style={[ styles.avisoBox, {backgroundColor: theme.lightPink,  borderColor: theme.accent, }, ]} >
        <Text style={[ styles.avisoTitulo, {  color: theme.primary, }, ]} >Combo {tamanho} — até {limite} unidades</Text>
        <Text style={[ styles.avisoSubtitulo,  {color: theme.textSecondary, }, ]} >  Escolha entre os sabores abaixo </Text>
      </View>

      <View style={styles.progressoWrapper}>
        <Text style={[ styles.progressoLabel,  {  color: theme.textSecondary,  }, ]} > Você selecionou{" "}
          <Text style={{  fontWeight: "700", color: theme.primary, }}>  {totalUnidades} / {limite} </Text>
        </Text>
        <View style={[ styles.progressoBarraFundo, { backgroundColor: theme.border,}, ]}>
          <View style={[ styles.progressoBarraPreenchida, {
                width: `${progresso * 100}%`,
                backgroundColor: atingiuLimite
                  ? theme.accent
                  : theme.lightPink, }, ]} />
        </View>
      </View>
  
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator
            size="large"
            color={theme.accent}
          />
        </View>
      ) : (
        <FlatList
          data={produtos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const qtd =
              quantidades[item.id] || 0;

            return (
              <View style={[  styles.itemCard, { backgroundColor: theme.surface,  shadowColor: theme.cardShadow,  }, ]}>

                {item.imagem ? (
                  <Image source={{ uri: item.imagem }}style={[ styles.itemImage,  {backgroundColor: theme.border,},  ]} />
                ) : (
                  <View style={[ styles.itemImage,styles.itemImagePlaceholder, {  backgroundColor:  theme.border,}, ]} >
                    <Ionicons
                      name="fast-food-outline"
                      size={20}
                      color={theme.textMuted}
                    />
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={[ styles.itemNome,  {  color: theme.primary, }, ]}  > {item.nome} </Text>

                  <Text  style={[ styles.itemPreco,  {  color: theme.darkPink,}, ]} >
                    {formatarPreco(
                      precoUnitario(item) )}  
                  </Text>
                </View>

    
                <View style={styles.stepper}>
          
                  <TouchableOpacity style={[styles.stepperButton, {
                        backgroundColor:
                          qtd === 0
                            ? theme.border
                            : theme.accent,
                      },
                    ]}  onPress={() => alterarQuantidade(
                        item.id,
                        -1
                      )
                    } disabled={qtd === 0}>
                    <Ionicons
                      name="remove"
                      size={16}
                      color={
                        qtd === 0
                          ? theme.textMuted
                          : theme.text
                      }
                    />
                  </TouchableOpacity>

              
                  <TextInput style={[  styles.stepperInput, {
                        color: theme.primary,
                        borderColor: theme.border,
                        backgroundColor:
                          theme.surface,
                      },
                    ]}
                    value={String(qtd)}
                    onChangeText={(texto) =>
                      definirQuantidade(
                        item.id,
                        texto
                      )
                    }
                    keyboardType="number-pad"
                    textAlign="center"
                    selectTextOnFocus
                    maxLength={4}
                  />

                  <TouchableOpacity  style={[ styles.stepperButton, { backgroundColor: atingiuLimite
                            ? theme.border
                            : theme.accent, }, ]} onPress={() => alterarQuantidade( item.id, 1 ) } disabled={atingiuLimite} >
                    <Ionicons
                      name="add"
                      size={16}
                      color={
                        atingiuLimite
                          ? theme.textMuted
                          : theme.surface
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={[styles.footer, {  backgroundColor: theme.surface, borderTopColor: theme.border, }, ]} >
        <View style={styles.footerResumo}>
          <Text style={[  styles.footerUnidades, { color: theme.textSecondary, },]}> {totalUnidades} / {limite} unidades </Text>

          <Text style={[ styles.footerTotal, { color: theme.primary, }, ]}> {formatarPreco(totalValor)} </Text>
        </View>

        <TouchableOpacity style={[ styles.addButton, {
              backgroundColor:
                totalUnidades === 0
                  ? theme.lightPink
                  : theme.accent,
            },
          ]}
          onPress={adicionarAoCarrinho}
          disabled={totalUnidades === 0}
        >
          <Text
            style={[ styles.addButtonText,   { color: theme.text, },  ]} >  ADICIONAR AO CARRINHO </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // HEADER

  header: {
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
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



  avisoBox: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },

  avisoTitulo: {
    fontSize: 14,
    fontWeight: "700",
  },

  avisoSubtitulo: {
    fontSize: 12,
    marginTop: 2,
  },

  progressoWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
  },

  progressoLabel: {
    fontSize: 13,
    marginBottom: 6,
  },

  progressoBarraFundo: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressoBarraPreenchida: {
    height: "100%",
    borderRadius: 4,
  },

  lista: {
    padding: 16,
    paddingBottom: 130,
  },

  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,

    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 2,
  },

  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },

  itemImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },

  itemNome: {
    fontSize: 14,
    fontWeight: "700",
  },

  itemPreco: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: "600",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  stepperInput: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 30,
    height: 32,
    textAlign: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 0,
  },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },

  footerResumo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  footerUnidades: {
    fontSize: 13,
    fontWeight: "600",
  },

  footerTotal: {
    fontSize: 15,
    fontWeight: "800",
  },

  addButton: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },

  addButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});