import React, { useState } from "react";
import { View, ScrollView, Text, TouchableOpacity, ImageBackground, StyleSheet,} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import About from "../components/About";
import Contact from "../components/Contact";
import { useTheme } from "../context/ThemeContext";

const IMG_PACOTES = {
  uri: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600",
};

const IMG_SALGADOS = {
  uri: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
};

export default function Home({ navigation, route }) {
  const userName = "Maria";

  const nextEvent = {
    title: "Aniversário do João",
    date: "25/05/2025",
    daysLeft: 12,
  };

  const [showAbout, setShowAbout] = useState(true);
  const [showContact, setShowContact] = useState(false);

  const { theme } = useTheme();

  return (
    <View style={[ styles.container, { backgroundColor: theme.background },]} >
      <ScrollView showsVerticalScrollIndicator={false}contentContainerStyle={styles.scrollContent}>
        <View style={[ styles.header,  { backgroundColor: theme.primary },   ]} >
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: theme.text }, ]}>Olá, {userName}! 👋 </Text>

              <Text style={[ styles.subGreeting, { color: theme.lightPink },  ]} >Seja bem-vinda de volta </Text>
            </View>

            <TouchableOpacity style={[ styles.bellButton, { backgroundColor: theme.softBlue },]} onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[ styles.eventCard, {  backgroundColor: theme.surface,  shadowColor: theme.cardShadow,  }, ]} >
          <View style={{ flex: 1 }}>
            <Text style={[ styles.eventLabel,  { color: theme.textMuted },]} > Próximo evento </Text>
            <Text style={[  styles.eventTitle, { color: theme.primary }, ]} > {nextEvent.title}</Text>
            <Text style={[ styles.eventDate, { color: theme.textSecondary },]}> {nextEvent.date}</Text>
          </View>

          <View style={[ styles.countdownBadge,  { backgroundColor: theme.accent },  ]}>
            <Text style={[ styles.countdownNumber, { color: theme.surface }, ]} >{nextEvent.daysLeft}</Text>
            <Text style={[ styles.countdownLabel, { color: theme.surface }, ]} > dias </Text>
          </View>
        </View>

     
        <Text style={[ styles.sectionTitle, { color: theme.primary },  ]}>  O que você deseja?</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.bannerCard} onPress={() =>navigation.navigate("PacotesDeFesta") }>
          <ImageBackground source={IMG_PACOTES}style={styles.bannerImage} imageStyle={styles.bannerImageRadius}>
            <View style={[ styles.bannerOverlay, { backgroundColor: `${theme.accent}8C`, },]}>
              <Ionicons
                name="gift-outline"
                size={18}
                color={theme.surface}
                style={{ marginBottom: 4 }}
              />

              <Text style={[ styles.bannerTitle,  { color: theme.surface },]} >PACOTES DE FESTA</Text>
              <Text style={[ styles.bannerSubtitle, { color: theme.surface }, ]} >  Espaço + estrutura para seu evento  </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>


        <TouchableOpacity activeOpacity={0.85} style={styles.bannerCard}onPress={() => navigation.navigate("Catalogo") }>
          <ImageBackground source={IMG_SALGADOS} style={styles.bannerImage}imageStyle={styles.bannerImageRadius}>
            <View style={[styles.bannerOverlay, { backgroundColor: `${theme.primary}8C`,}, ]} >
              <Ionicons
                name="fast-food-outline"
                size={18}
                color={theme.surface}
                style={{ marginBottom: 4 }}
              />
              <Text style={[ styles.bannerTitle,{ color: theme.surface },]}> SALGADOS AVULSOS</Text>
              <Text style={[styles.bannerSubtitle, { color: theme.surface },]} > Encomende seus salgados favoritos
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>
      </ScrollView>


      <View style={[styles.bottomActions, { backgroundColor: theme.surface, borderTopColor: theme.border, }, ]}>
        <TouchableOpacity  style={[ styles.actionCard, { backgroundColor: theme.surface, shadowColor: theme.cardShadow, },]} onPress={() => setShowAbout(true)} activeOpacity={0.8} >
          <MaterialIcons
            name="info"
            size={28}
            color={theme.accent}
          />
          <Text style={[  styles.actionText, { color: theme.primary }, ]}> Sobre Nós </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionCard, {  backgroundColor: theme.surface,shadowColor: theme.cardShadow, }, ]} onPress={() => setShowContact(true)}activeOpacity={0.8} >
          <MaterialIcons
            name="phone"
            size={28}
            color={theme.accent}
          />

          <Text style={[styles.actionText, { color: theme.primary },]}>  Contato</Text>
        </TouchableOpacity>
      </View>

 
      <About visible={showAbout} onClose={() => setShowAbout(false)}/>

      <Contact visible={showContact} onClose={() => setShowContact(false)} />
    </View>
  );
}

const styles = StyleSheet.create({

  container: {

    flex: 1,

  },

  scrollContent: {
    paddingBottom: 30,
  },

  header: {

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

    fontSize: 20,
    fontWeight: "700",
  },

  subGreeting: {

    fontSize: 13,
    marginTop: 2,
  },

  bellButton: {
    width: 38,
    height: 38,

    borderRadius: 19,


    
    alignItems: "center",
    justifyContent: "center",
  },


  eventCard: {
    marginHorizontal: 20,
    marginTop: 20,


    borderRadius: 16,

    padding: 16,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",


    shadowOpacity: 0.08,
    shadowRadius: 10,

    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  eventLabel: {

    fontSize: 12,
    marginBottom: 4,
  },

  eventTitle: {

    fontSize: 15,
    fontWeight: "700",
  },

  eventDate: {

    fontSize: 12,
    marginTop: 2,
  },

  countdownBadge: {

    borderRadius: 12,

    paddingVertical: 8,
    paddingHorizontal: 14,

    alignItems: "center",

    minWidth: 54,
  },

  countdownNumber: {

    fontSize: 16,

    fontWeight: "800",
  },

  countdownLabel: {

    fontSize: 10,
  },


  sectionTitle: {


    fontSize: 17,

    fontWeight: "700",

    marginTop: 35,
    marginHorizontal: 20,
    marginBottom: 18,

    textAlign: "center",
  },

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


    fontSize: 16,

    fontWeight: "800",

    letterSpacing: 0.3,
  },

  bannerSubtitle: {
    

    fontSize: 11,

    marginTop: 3,

    opacity: 0.9,
  },

  bottomActions: {
    flexDirection: "row",

    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingBottom: 20,

    borderTopWidth: 1,

  },

  actionCard: {
    flex: 1,

    borderRadius: 12,


    alignItems: "center",

    paddingVertical: 10,

    marginHorizontal: 5,

    elevation: 2,


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


    textAlign: "center",
  },

});