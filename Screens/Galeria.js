import React, { useEffect, useMemo, useRef, useState } from "react";
import {View, Text, Image, ScrollView, TouchableOpacity, Modal, FlatList, Dimensions, StatusBar, StyleSheet, Platform, Alert,} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../context/ThemeContext"; // ajuste o caminho conforme seu projeto

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const PADDING = 16;
const GAP = 12;
const COL_W = (SCREEN_W - PADDING * 2 - GAP) / 2;

const GALERIA_DIR = `${FileSystem.documentDirectory}galeria/`;
const GALERIA_FILE = `${FileSystem.documentDirectory}vidapark_galeria.json`;

// limita a altura dos cards pra não ficarem finos/altos demais
function calcRatio(width, height) {
  if (!width || !height) return 1.2;
  return Math.min(Math.max(height / width, 0.8), 1.6);
}

export default function GaleriaScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [fotos, setFotos] = useState([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerListRef = useRef(null);

  useEffect(() => {
    carregarFotos();
  }, []);

  // ---------------------------------------------------------------------
  // Persistência
  // ---------------------------------------------------------------------
  async function carregarFotos() {
    try {
      const info = await FileSystem.getInfoAsync(GALERIA_FILE);
      if (!info.exists) return;

      const data = await FileSystem.readAsStringAsync(GALERIA_FILE);
      const lista = JSON.parse(data);

      // descarta fotos cujo arquivo não existe mais
      const validas = [];
      for (const foto of lista) {
        const f = await FileSystem.getInfoAsync(foto.uri);
        if (f.exists) validas.push(foto);
      }
      setFotos(validas);
    } catch (e) {
      console.log("Erro ao carregar galeria:", e);
    }
  }

  async function salvarLista(lista) {
    try {
      await FileSystem.writeAsStringAsync(GALERIA_FILE, JSON.stringify(lista));
    } catch (e) {
      console.log("Erro ao salvar galeria:", e);
    }
  }

  // ---------------------------------------------------------------------
  // Adicionar / remover
  // ---------------------------------------------------------------------
  async function adicionarFotos() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled) return;

      const dirInfo = await FileSystem.getInfoAsync(GALERIA_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(GALERIA_DIR, { intermediates: true });
      }

      const novas = [];
      for (const asset of result.assets) {
        const id = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const ext = (asset.uri.split(".").pop() || "jpg").split("?")[0];
        const destino = `${GALERIA_DIR}${id}.${ext}`;

        await FileSystem.copyAsync({ from: asset.uri, to: destino });

        novas.push({
          id,
          uri: destino,
          width: asset.width,
          height: asset.height,
        });
      }

      const lista = [...novas, ...fotos];
      setFotos(lista);
      await salvarLista(lista);
    } catch (e) {
      console.log("Erro ao adicionar fotos:", e);
      Alert.alert("Ops", "Não foi possível adicionar as fotos.");
    }
  }

  function confirmarRemocao(foto) {
    Alert.alert("Remover foto", "Deseja remover esta foto da galeria?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => removerFoto(foto),
      },
    ]);
  }

  async function removerFoto(foto) {
    try {
      await FileSystem.deleteAsync(foto.uri, { idempotent: true });
    } catch (e) {
      console.log("Erro ao apagar arquivo:", e);
    }
    const lista = fotos.filter((f) => f.id !== foto.id);
    setFotos(lista);
    setViewerOpen(false);
    await salvarLista(lista);
  }

  // ---------------------------------------------------------------------
  // Mosaico: cada foto vai para a coluna mais baixa (equilibra as alturas)
  // ---------------------------------------------------------------------
  const [colEsq, colDir] = useMemo(() => {
    const esq = [];
    const dir = [];
    let hEsq = 0;
    let hDir = 0;

    fotos.forEach((foto, index) => {
      const ratio = calcRatio(foto.width, foto.height);
      const item = { ...foto, index, ratio };
      if (hEsq <= hDir) {
        esq.push(item);
        hEsq += ratio;
      } else {
        dir.push(item);
        hDir += ratio;
      }
    });

    return [esq, dir];
  }, [fotos]);

  function abrirFoto(index) {
    setViewerIndex(index);
    setViewerOpen(true);
  }

  function renderCard(foto) {
    return (
      <TouchableOpacity
        key={foto.id}
        activeOpacity={0.85}
        onPress={() => abrirFoto(foto.index)}
        onLongPress={() => confirmarRemocao(foto)}
        style={[styles.card, { height: COL_W * foto.ratio }]}
      >
        <Image source={{ uri: foto.uri }} style={styles.cardImage} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>VIDA PARK</Text>
            <Text style={styles.title}>Conheça nosso espaço</Text>
            <Text style={styles.subtitle}>
              Um lugar pensado para lazer, esporte e momentos inesquecíveis.
            </Text>
          </View>
        </View>

        {/* Barra de ações */}
        <View style={styles.actionsRow}>
          <Text style={styles.contador}>
            {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
          </Text>

          <TouchableOpacity style={styles.addButton} onPress={adicionarFotos} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Adicionar fotos</Text>
          </TouchableOpacity>
        </View>

        {/* Estado vazio */}
        {fotos.length === 0 ? (
          <TouchableOpacity style={styles.empty} onPress={adicionarFotos} activeOpacity={0.85}>
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={34} color={theme.accent} />
            </View>
            <Text style={styles.emptyTitle}>Sua galeria está vazia</Text>
            <Text style={styles.emptyText}>
              Toque aqui para escolher fotos do seu celular e mostrar os espaços do Vida Park.
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Grid em mosaico */}
            <View style={styles.grid}>
              <View style={styles.coluna}>{colEsq.map(renderCard)}</View>
              <View style={styles.coluna}>{colDir.map(renderCard)}</View>
            </View>

            <Text style={styles.dica}>Segure uma foto para removê-la</Text>
          </>
        )}
      </ScrollView>

      {/* Visualizador em tela cheia */}
      <Modal
        visible={viewerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setViewerOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.viewer}>
          <FlatList
            ref={viewerListRef}
            data={fotos}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={viewerIndex}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            onMomentumScrollEnd={(e) =>
              setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
            }
            renderItem={({ item }) => (
              <View style={styles.viewerSlide}>
                <Image source={{ uri: item.uri }} style={styles.viewerImage} resizeMode="contain" />
              </View>
            )}
          />

          {/* Topo */}
          <View style={styles.viewerTop}>
            <View style={styles.viewerCounter}>
              <Text style={styles.viewerCounterText}>
                {viewerIndex + 1} / {fotos.length}
              </Text>
            </View>

            <View style={styles.viewerButtons}>
              <TouchableOpacity
                onPress={() => fotos[viewerIndex] && confirmarRemocao(fotos[viewerIndex])}
                style={styles.viewerGhostButton}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setViewerOpen(false)}
                style={styles.viewerClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      paddingBottom: 40,
    },

    // Cabeçalho
    header: {
      flexDirection: "row",
      paddingHorizontal: PADDING,
      paddingTop: 20,
      paddingBottom: 8,
    },
    eyebrow: {
      color: theme.accent,
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 3,
      marginBottom: 6,
    },
    title: {
      color: theme.dark ? theme.text : theme.primary,
      fontSize: 30,
      fontWeight: "800",
      lineHeight: 36,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 6,
    },

    // Ações
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: PADDING,
      paddingVertical: 14,
    },
    contador: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.accent,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 999,
      shadowColor: theme.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    addButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },

    // Estado vazio
    empty: {
      marginHorizontal: PADDING,
      marginTop: 12,
      paddingVertical: 48,
      paddingHorizontal: 28,
      alignItems: "center",
      borderRadius: 24,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: theme.accent,
      backgroundColor: theme.surface,
    },
    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: theme.dark ? "rgba(232,72,144,0.15)" : "rgba(232,72,144,0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    emptyTitle: {
      color: theme.dark ? theme.text : theme.primary,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 6,
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },

    // Grid
    grid: {
      flexDirection: "row",
      paddingHorizontal: PADDING,
      gap: GAP,
    },
    coluna: {
      width: COL_W,
      gap: GAP,
    },
    card: {
      width: COL_W,
      borderRadius: 22,
      overflow: "hidden",
      backgroundColor: theme.surface,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.dark ? 0.35 : 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    cardImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    dica: {
      color: theme.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginTop: 20,
    },

    // Visualizador
    viewer: {
      flex: 1,
      backgroundColor: "rgba(16, 16, 36, 0.97)",
    },
    viewerSlide: {
      width: SCREEN_W,
      height: SCREEN_H,
      justifyContent: "center",
      alignItems: "center",
    },
    viewerImage: {
      width: SCREEN_W,
      height: SCREEN_H * 0.78,
    },
    viewerTop: {
      position: "absolute",
      top: Platform.OS === "android" ? (StatusBar.currentHeight || 0) + 12 : 56,
      left: 16,
      right: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    viewerCounter: {
      backgroundColor: "rgba(255,255,255,0.14)",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
    },
    viewerCounterText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    viewerButtons: {
      flexDirection: "row",
      gap: 10,
    },
    viewerGhostButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.14)",
      justifyContent: "center",
      alignItems: "center",
    },
    viewerClose: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.accent,
      justifyContent: "center",
      alignItems: "center",
    },
  });
}