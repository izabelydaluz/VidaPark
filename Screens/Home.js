import React from "react";
import { View, ScrollView, Text, TouchableOpacity, ImageBackground, StyleSheet } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import About from "../components/About";
import Contact from "../components/Contact";
import { useState } from "react";

// ─────────────────────────────────────────────
// PALETA "VIDA PARK"
// Mude aqui se algum tom precisar de ajuste.
// ─────────────────────────────────────────────
const COLORS = {
  azulVidaPark: "#202040",   // Fundo, cabeçalho, rodapé
  rosaVidaPark: "#E84890",   // Botões, títulos, ícones e destaques
  branco: "#F8F8F8",         // Textos, fundos e contraste
  rosaClaro: "#F7A8C8",      // Hover, detalhes e fundos suaves
  azulSuave: "#34345C",      // Cards, seções e elementos secundários
  rosaEscuro: "#C93678",     // Hover dos botões e elementos de destaque
  textoSecundario: "#6B6B85",
  textoMutado: "#B3B3C6",
};

// Troque pelas imagens reais do seu projeto (require('../assets/...') ou uma URL do Firebase Storage)
const IMG_PACOTES = { uri: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600" };
const IMG_SALGADOS = { uri: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600" };

export default function Home({ navigation, route }) {
  // Mock -- troque pelos dados reais (auth.currentUser, Firestore, etc.)
  const userName = "Maria";
  const nextEvent = { title: "Aniversário do João", date: "25/05/2025", daysLeft: 12 };
  const [showAbout, setShowAbout] = useState(route?.params?.showWelcomeModal || false);
  const [showContact, setShowContact] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>



        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Olá, {userName}! 👋</Text>
              <Text style={styles.subGreeting}>Seja bem-vinda de volta</Text>
            </View>

            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={COLORS.branco}
              />
            </TouchableOpacity>
          </View>

          
        </View>



        {/* ───── CARD: PRÓXIMO EVENTO ───── */}
        <View style={styles.eventCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventLabel}>Próximo evento</Text>
            <Text style={styles.eventTitle}>{nextEvent.title}</Text>
            <Text style={styles.eventDate}>{nextEvent.date}</Text>
          </View>

          <View style={styles.countdownBadge}>
            <Text style={styles.countdownNumber}>{nextEvent.daysLeft}</Text>
            <Text style={styles.countdownLabel}>dias</Text>
          </View>
        </View>

        {/* ───── SEÇÃO: O QUE VOCÊ DESEJA ───── */}
        <Text style={styles.sectionTitle}>O que você deseja?</Text>

        {/* Card 1 -- Pacotes de Festa */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bannerCard}
          onPress={() => navigation.navigate("PacotesDeFesta")}
        >
          <ImageBackground source={IMG_PACOTES} style={styles.bannerImage} imageStyle={styles.bannerImageRadius}>
            <View style={[styles.bannerOverlay, { backgroundColor: "rgba(232,72,144,0.55)" }]}>
              <Ionicons name="gift-outline" size={18} color={COLORS.branco} style={{ marginBottom: 4 }} />
              <Text style={styles.bannerTitle}>PACOTES DE FESTA</Text>
              <Text style={styles.bannerSubtitle}>Espaço + estrutura para seu evento</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        {/* Card 2 -- Salgados Avulsos */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.bannerCard}
          onPress={() => navigation.navigate("Catalogo")}
        >
          <ImageBackground source={IMG_SALGADOS} style={styles.bannerImage} imageStyle={styles.bannerImageRadius}>
            <View style={[styles.bannerOverlay, { backgroundColor: "rgba(32,32,64,0.55)" }]}>
              <Ionicons name="fast-food-outline" size={18} color={COLORS.branco} style={{ marginBottom: 4 }} />
              <Text style={styles.bannerTitle}>SALGADOS AVULSOS</Text>
              <Text style={styles.bannerSubtitle}>Encomende seus salgados favoritos</Text>
            </View>


          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomActions}>

    <TouchableOpacity
      style={styles.actionCard}
      onPress={() => setShowAbout(true)}
      activeOpacity={0.8}
    >
      <MaterialIcons
        name="info"
        size={28}
        color={COLORS.rosaVidaPark}
      />

      <Text style={styles.actionText}>
        Sobre Nós
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.actionCard}
      onPress={() => setShowContact(true)}
      activeOpacity={0.8}
    >
      <MaterialIcons
        name="phone"
        size={28}
        color={COLORS.rosaVidaPark}
      />

      <Text style={styles.actionText}>
        Contato
      </Text>
    </TouchableOpacity>

  </View>

  <About
    visible={showAbout}
    onClose={() => setShowAbout(false)}
  />

  <Contact
    visible={showContact}
    onClose={() => setShowContact(false)}
  />




    </View>
  );
}

const styles = StyleSheet.create({

  // ─────────────────────────────────────────────
  // CONTAINER PRINCIPAL
  // ─────────────────────────────────────────────

  container: {
    flex: 1,
    backgroundColor: COLORS.branco,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ─────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────

  header: {
    backgroundColor: COLORS.azulVidaPark,
    paddingTop: 30,
    paddingHorizontal: 20,
    paddingBottom: 25,

    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",

    paddingTop: 25,
  },

  greeting: {
    color: COLORS.branco,
    fontSize: 20,
    fontWeight: "700",
  },

  subGreeting: {
    color: COLORS.rosaClaro,
    fontSize: 13,
    marginTop: 2,
  },

  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,

    backgroundColor: COLORS.azulSuave,

    alignItems: "center",
    justifyContent: "center",
  },

  // ─────────────────────────────────────────────
  // CARD DE PRÓXIMO EVENTO
  // ─────────────────────────────────────────────

  eventCard: {
    marginHorizontal: 20,
    marginTop: 20,

    backgroundColor: COLORS.branco,

    borderRadius: 16,

    padding: 16,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  eventLabel: {
    color: COLORS.textoMutado,
    fontSize: 12,
    marginBottom: 4,
  },

  eventTitle: {
    color: COLORS.azulVidaPark,
    fontSize: 15,
    fontWeight: "700",
  },

  eventDate: {
    color: COLORS.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },

  countdownBadge: {
    backgroundColor: COLORS.rosaVidaPark,

    borderRadius: 12,

    paddingVertical: 8,
    paddingHorizontal: 14,

    alignItems: "center",

    minWidth: 54,
  },

  countdownNumber: {
    color: COLORS.branco,
    fontSize: 16,
    fontWeight: "800",
  },

  countdownLabel: {
    color: COLORS.rosaClaro,
    fontSize: 10,
  },

  // ─────────────────────────────────────────────
  // TÍTULO DA SEÇÃO
  // ─────────────────────────────────────────────

  sectionTitle: {
    color: COLORS.azulVidaPark,

    fontSize: 17,
    fontWeight: "700",

    marginTop: 35,
    marginHorizontal: 20,
    marginBottom: 18,

    textAlign: "center",
  },

  // ─────────────────────────────────────────────
  // CARDS / BANNERS
  // ─────────────────────────────────────────────

  bannerCard: {
    marginHorizontal: 20,
    marginBottom: 16,

    borderRadius: 18,

    overflow: "hidden",
  },

  bannerImage: {
    width: "100%",
    height: 140,

    justifyContent: "flex-end",
  },

  bannerImageRadius: {
    borderRadius: 18,
  },

  bannerOverlay: {
    padding: 14,

    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },

  bannerTitle: {
    color: COLORS.branco,

    fontSize: 16,
    fontWeight: "800",

    letterSpacing: 0.3,
  },

  bannerSubtitle: {
    color: COLORS.branco,

    fontSize: 11,

    marginTop: 3,

    opacity: 0.9,
  },

  // ─────────────────────────────────────────────
  // BOTÕES INFERIORES
  // SOBRE NÓS / CONTATO
  // ─────────────────────────────────────────────

  bottomActions: {
    flexDirection: "row",

    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: 20,

    backgroundColor: COLORS.branco,

    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  actionCard: {
    flex: 1,

    backgroundColor: COLORS.branco,

    borderRadius: 12,

    alignItems: "center",

    paddingVertical: 10,

    marginHorizontal: 5,

    elevation: 2,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,
      height: 1,
    },

    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  actionText: {
    marginTop: 6,

    fontSize: 12,
    fontWeight: "700",

    color: COLORS.azulVidaPark,

    textAlign: "center",
  },

});