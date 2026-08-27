import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

export default function TamanhoCombo({ navigation }) {
  const { theme } = useTheme();

  const combos = [
    {
      tamanho: "P",
      title: "Combo Pequeno",
      subtitle: "Até 40 salgados",
      limite: 40,
      icon: "fast-food-outline",
    },

    {
      tamanho: "M",
      title: "Combo Médio",
      subtitle: "Até 60 salgados",
      limite: 60,
      icon: "fast-food-outline",
    },

    {
      tamanho: "G",
      title: "Combo Grande",
      subtitle: "Até 100 salgados",
      limite: 100,
      icon: "fast-food-outline",
    },
  ];

  function selecionarCombo(combo) {
    navigation.navigate("MonteSeuCombo", {
      tamanho: combo.tamanho,
      limite: combo.limite,
    });
  }

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.title,
            { color: theme.primary },
          ]}
        >
          Monte seu Combo
        </Text>

        <Text
          style={[
            styles.description,
            { color: theme.textSecondary },
          ]}
        >
          Escolha o tamanho do seu combo para continuar
        </Text>
      </View>

      <View style={styles.menu}>
        {combos.map((combo) => (
          <TouchableOpacity
            key={combo.tamanho}
            style={[
              styles.card,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                shadowColor: theme.cardShadow,
              },
            ]}
            onPress={() => selecionarCombo(combo)}
            activeOpacity={0.7}
          >
            <View style={styles.cardLeft}>
              <Ionicons
                name={combo.icon}
                size={28}
                color={theme.accent}
                style={styles.cardIcon}
              />

              <View>
                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.primary },
                  ]}
                >
                  {combo.title}
                </Text>

                <Text
                  style={[
                    styles.cardSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {combo.subtitle}
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.arrow,
                { color: theme.primary },
              ]}
            >
              ›
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 15,
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    alignItems: "center",
    marginBottom: 30,
    marginTop: 150,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
  },

  description: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },

  menu: {
    gap: 12,
    marginTop: 10,
  },

  card: {
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    borderWidth: 1,

    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  cardIcon: {
    marginRight: 14,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },

  cardSubtitle: {
    marginTop: 5,
    fontSize: 13,
  },

  arrow: {
    fontSize: 30,
  },
});