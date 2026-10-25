import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useProducts } from "../../../context/ProductContext";
import { useTheme } from "../../../context/ThemeContext";
import { confirmarSaida } from "../utils/sessao";
import appConfig from "../../../app.json";

const VERSAO = appConfig.expo.version;
const EMAIL_SUPORTE = "VidaPark@gmail.com";
const URL_INSTAGRAM = "https://www.instagram.com/vidapark/";

async function abrirLink(url, mensagemErro) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Erro", mensagemErro);
  }
}

export default function Settings({ navigation }) {
  const { clearCart } = useProducts();
  const { theme, toggleTheme } = useTheme();

  function handleClearCart() {
    Alert.alert("Limpar carrinho", "Deseja realmente esvaziar o carrinho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Limpar",
        style: "destructive",
        onPress: () => {
          clearCart();
          Alert.alert("Sucesso", "Carrinho limpo com sucesso!");
        },
      },
    ]);
  }

  function handleLogout() {
    // também esvazia o carrinho salvo no aparelho, para não passar para a próxima conta
    confirmarSaida(navigation, () => clearCart());
  }

  const menuItems = [
    {
      section: "Aparência",
      items: [
        {
          title: "Modo escuro",
          subtitle: theme.dark ? "Ativado" : "Desativado",
          icon: "moon-outline",
          type: "switch",
          value: theme.dark,
          onToggle: toggleTheme,
        },
      ],
    },
    {
      section: "Dados",
      items: [
        {
          title: "Limpar carrinho",
          subtitle: "Esvaziar o carrinho de compras",
          icon: "cart-outline",
          type: "action",
          onPress: handleClearCart,
        },
      ],
    },
    {
      section: "Sobre",
      items: [
        {
          title: "Instagram",
          subtitle: "@VidaPark",
          icon: "logo-instagram",
          type: "action",
          onPress: () => abrirLink(URL_INSTAGRAM, "Não foi possível abrir o Instagram."),
        },
        {
          title: "Suporte",
          subtitle: EMAIL_SUPORTE,
          icon: "mail-outline",
          type: "action",
          onPress: () =>
            abrirLink(`mailto:${EMAIL_SUPORTE}`, `Não foi possível abrir o e-mail. Escreva para ${EMAIL_SUPORTE}.`),
        },
        {
          title: "Versão do aplicativo",
          subtitle: `Vida Park v${VERSAO}`,
          icon: "information-circle-outline",
          type: "info",
        },
      ],
    },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Configurações</Text>
        <View style={{ width: 24 }} />
      </View>

      {menuItems.map((section) => (
        <View key={section.section} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{section.section}</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.surface }]}>
            {section.items.map((item, iIndex) => (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.menuItem,
                  iIndex < section.items.length - 1 && [styles.menuItemBorder, { borderBottomColor: theme.border }],
                ]}
                onPress={item.type === "action" ? item.onPress : item.type === "switch" ? item.onToggle : undefined}
                disabled={item.type === "info"}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon} size={22} color={theme.primary} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.menuSubtitle, { color: theme.textMuted }]}>{item.subtitle}</Text>
                  </View>
                </View>
                {item.type === "switch" && (
                  <Switch
                    value={item.value}
                    onValueChange={item.onToggle}
                    trackColor={{ false: "#ddd", true: theme.accent }}
                    thumbColor={item.value ? theme.primary : "#f4f4f4"}
                  />
                )}
                {item.type === "action" && <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
      >
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutButtonText}>Sair da conta</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  section: { marginTop: 16, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  menuItemBorder: { borderBottomWidth: 1 },
  menuItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  menuIcon: { marginRight: 14 },
  menuTextContainer: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600" },
  menuSubtitle: { fontSize: 13, marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#f44336",
    marginHorizontal: 16,
    marginTop: 30,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoutButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
