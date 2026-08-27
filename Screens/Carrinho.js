import React, { useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const TAXA_ENTREGA = 5.0;

export default function Carrinho({ navigation, route }) {
  const combo = route?.params?.combo || [];
  const totalCombo = route?.params?.total || 0;

  const { theme } = useTheme();

  const totalUnidades = useMemo(
    () =>
      combo.reduce(
        (soma, item) => soma + item.quantidade,
        0
      ),
    [combo]
  );

  const totalGeral =
    totalCombo +
    (combo.length > 0 ? TAXA_ENTREGA : 0);

  function formatarPreco(valor) {
    return `R$ ${Number(valor || 0)
      .toFixed(2)
      .replace(".", ",")}`;
  }

  function finalizarPedido() {
    navigation.navigate("Checkout", {
      combo,
      totalCombo,
      taxaEntrega: TAXA_ENTREGA,
      totalGeral,
    });
  }

  /* CARRINHO VAZIO */
  if (combo.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            styles.header,
            { backgroundColor: theme.primary },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconButton}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text
            style={[
              styles.headerTitle,
              { color: theme.text },
            ]}
          >
            Meu carrinho
          </Text>

          <View style={styles.iconButton} />
        </View>

        <View style={styles.emptyBox}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: theme.border },
            ]}
          >
            <Ionicons
              name="cart-outline"
              size={40}
              color={theme.textMuted}
            />
          </View>

          <Text
            style={[
              styles.emptyTitle,
              { color: theme.primary },
            ]}
          >
            Seu carrinho está vazio
          </Text>

          <Text
            style={[
              styles.emptySubtitle,
              { color: theme.textSecondary },
            ]}
          >
            Adicione itens para continuar seu pedido.
          </Text>

          <TouchableOpacity
            style={[
              styles.emptyButton,
              { backgroundColor: theme.accent },
            ]}
            onPress={() =>
              navigation.navigate("Catalogo")
            }
          >
            <Text
              style={[
                styles.emptyButtonText,
                { color: theme.text },
              ]}
            >
              VER CATÁLOGO
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* CARRINHO COM ITENS */
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.primary },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.text}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            { color: theme.text },
          ]}
        >
          Meu carrinho
        </Text>

        <View style={styles.iconButton} />
      </View>

      <FlatList
        data={combo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View
            style={[
              styles.resumoCard,
              {
                backgroundColor: theme.surface,
                shadowColor: theme.cardShadow,
              },
            ]}
          >
            <View style={styles.resumoTopo}>
              <View>
                <Text
                  style={[
                    styles.resumoTitulo,
                    { color: theme.primary },
                  ]}
                >
                  Monte seu combo
                </Text>

                <Text
                  style={[
                    styles.resumoSubtitulo,
                    { color: theme.textSecondary },
                  ]}
                >
                  {totalUnidades} unidades{"  "}

                  <Text
                    style={[
                      styles.resumoValorDestaque,
                      { color: theme.darkPink },
                    ]}
                  >
                    {formatarPreco(totalCombo)}
                  </Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.editarButton,
                  { borderColor: theme.accent },
                ]}
                onPress={() =>
                  navigation.navigate("MonteSeuCombo")
                }
              >
                <Text
                  style={[
                    styles.editarButtonText,
                    { color: theme.accent },
                  ]}
                >
                  Editar combo
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.itemLinha,
              { borderBottomColor: theme.border },
            ]}
          >
            <Text
              style={[
                styles.itemNome,
                { color: theme.primary },
              ]}
            >
              {item.nome}{" "}

              <Text
                style={[
                  styles.itemQtd,
                  { color: theme.textMuted },
                ]}
              >
                {item.quantidade} un.
              </Text>
            </Text>

            <Text
              style={[
                styles.itemPreco,
                { color: theme.textSecondary },
              ]}
            >
              {formatarPreco(
                item.quantidade * item.precoUnitario
              )}
            </Text>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.resumoFinal}>
            <View style={styles.linhaValor}>
              <Text
                style={[
                  styles.linhaLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Taxa de entrega
              </Text>

              <Text
                style={[
                  styles.linhaValorTexto,
                  { color: theme.textSecondary },
                ]}
              >
                {formatarPreco(TAXA_ENTREGA)}
              </Text>
            </View>

            <View
              style={[
                styles.linhaValor,
                styles.linhaTotal,
                {
                  borderTopColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.totalLabel,
                  { color: theme.primary },
                ]}
              >
                Total
              </Text>

              <Text
                style={[
                  styles.totalValorTexto,
                  { color: theme.primary },
                ]}
              >
                {formatarPreco(totalGeral)}
              </Text>
            </View>
          </View>
        }
      />

      {/* BOTÃO FINALIZAR */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.finalizarButton,
            { backgroundColor: theme.accent },
          ]}
          onPress={finalizarPedido}
        >
          <Text
            style={[
              styles.finalizarButtonText,
              { color: theme.text },
            ]}
          >
            FINALIZAR PEDIDO
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

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

  lista: {
    padding: 16,
    paddingBottom: 130,
  },

  resumoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  resumoTopo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  resumoTitulo: {
    fontSize: 15,
    fontWeight: "700",
  },

  resumoSubtitulo: {
    fontSize: 13,
    marginTop: 6,
  },

  resumoValorDestaque: {
    fontWeight: "700",
  },

  editarButton: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  editarButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },

  itemLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },

  itemNome: {
    fontSize: 14,
    fontWeight: "600",
  },

  itemQtd: {
    fontSize: 12,
    fontWeight: "400",
  },

  itemPreco: {
    fontSize: 14,
    fontWeight: "600",
  },

  resumoFinal: {
    marginTop: 16,
  },

  linhaValor: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  linhaLabel: {
    fontSize: 13,
  },

  linhaValorTexto: {
    fontSize: 13,
    fontWeight: "600",
  },

  linhaTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
  },

  totalValorTexto: {
    fontSize: 15,
    fontWeight: "800",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },

  finalizarButton: {
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
  },

  finalizarButtonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  emptyBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },

  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
  },

  emptyButton: {
    
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 24,
  },

  emptyButtonText: {

    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});