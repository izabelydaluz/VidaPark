import React, { useEffect, useMemo, useRef, useState } from "react";
import {  View,  Text,  Image,  ScrollView,TouchableOpacity,  Modal,  FlatList,  Dimensions,  StatusBar,  StyleSheet , Platform,  Alert, BackHandler, ActivityIndicator,} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,} from "firebase/firestore";
import { db  } from '../Firebase/firebaseConfig';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET,} from "../cloudinaryConfig";
import { useTheme } from "../context/ThemeContext";
import * as FileSystem from "expo-file-system/legacy";



const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const PADDING = 16;
const GAP = 12;
const COL_W = (SCREEN_W - PADDING * 2 - GAP) / 2;

const COLECAO = "galeria"; // coleção no Firestore
const PASTA_STORAGE = "galeria"; // pasta no Storage

// limita a altura dos cards pra não ficarem finos/altos demais
function calcRatio(width, height) {
  if (!width || !height) return 1.2;
  return Math.min(Math.max(height / width, 0.8), 1.6);
}

// Uso:
//  - Galeria só para ver (clientes): <Tab.Screen name="Galeria" component={Galeria} />
//  - Galeria do admin (adicionar / selecionar / excluir):
//    <Stack.Screen name="GaleriaAdmin" component={Galeria} initialParams={{ admin: true }} />
export default function GaleriaScreen({ route }) {
  const admin = route?.params?.admin === true;

  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [fotos, setFotos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(null); // { atual, total }
  const [excluindo, setExcluindo] = useState(false);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const viewerListRef = useRef(null);

  // modo de seleção (admin)
  const [selecionando, setSelecionando] = useState(false);
  const [selecionadas, setSelecionadas] = useState([]);

  // ---------------------------------------------------------------------
  // Escuta o Firestore em tempo real (todo mundo vê as mesmas fotos)
  // ---------------------------------------------------------------------
  useEffect(() => {
    const q = query(collection(db, COLECAO), orderBy("criadoEm", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFotos(lista);
        setCarregando(false);
      },
      (erro) => {
        console.log("Erro ao carregar galeria:", erro);
        setCarregando(false);
      }
    );

    return unsubscribe;
  }, []);

  // botão voltar do Android cancela a seleção em vez de sair da tela
  useEffect(() => {
    if (!selecionando) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      cancelarSelecao();
      return true;
    });
    return () => sub.remove();
  }, [selecionando]);


async function enviarFoto(asset) {
  try {
    console.log("Imagem selecionada:", {
      uri: asset.uri,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
    });

    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const resposta = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: `data:${asset.mimeType || "image/jpeg"};base64,${base64}`,
        upload_preset: CLOUDINARY_UPLOAD_PRESET,
      }),
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      console.log("Erro Cloudinary:", resultado);
      throw new Error(
        resultado?.error?.message || "Não foi possível enviar a imagem."
      );
    }

    if (!resultado.secure_url || !resultado.public_id) {
      throw new Error("O Cloudinary não retornou os dados da imagem.");
    }

    await addDoc(collection(db, "galeria"), {
      url: resultado.secure_url,
      publicId: resultado.public_id,
      width: resultado.width || asset.width || null,
      height: resultado.height || asset.height || null,
      criadoEm: serverTimestamp(),
    });

    console.log("Foto enviada com sucesso!");
  } catch (erro) {
    console.log("Erro detalhado ao enviar foto:", erro);
    throw erro;
  }
}

  async function adicionarFotos() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (result.canceled) return;

      const total = result.assets.length;
      let falhas = 0;

      for (let i = 0; i < total; i++) {
        setEnviando({ atual: i + 1, total });
        try {
          await enviarFoto(result.assets[i]);
        } catch (e) {
          console.log("Erro ao enviar foto:", e);
          falhas++;
        }
      }

      setEnviando(null);

      if (falhas > 0) {
        Alert.alert(
          "Ops",
          falhas === total
            ? "Não foi possível enviar as fotos. Verifique sua conexão e as regras do Firebase."
            : `${falhas} ${falhas === 1 ? "foto não foi enviada" : "fotos não foram enviadas"}.`
        );
      }
    } catch (e) {
      console.log("Erro ao adicionar fotos:", e);
      setEnviando(null);
      Alert.alert("Ops", "Não foi possível adicionar as fotos.");
    }
  }

  // ---------------------------------------------------------------------
  // Seleção e exclusão
  // ---------------------------------------------------------------------
  function iniciarSelecao(idInicial) {
    setSelecionando(true);
    setSelecionadas(idInicial ? [idInicial] : []);
  }

  function cancelarSelecao() {
    setSelecionando(false);
    setSelecionadas([]);
  }

  function alternarSelecao(id) {
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  }

  function selecionarTodas() {
    if (selecionadas.length === fotos.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(fotos.map((f) => f.id));
    }
  }

  function confirmarExclusao(ids) {
    if (ids.length === 0) return;
    const n = ids.length;

    Alert.alert(
      n === 1 ? "Excluir foto" : "Excluir fotos",
      `Deseja excluir ${n} ${n === 1 ? "foto" : "fotos"}? Ela some para todos os usuários e essa ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => excluirFotos(ids),
        },
      ]
    );
  }

  async function excluirFotos(ids) {
  setExcluindo(true);

  const alvo = fotos.filter((foto) => ids.includes(foto.id));
  let falhas = 0;

  for (const foto of alvo) {
    try {
      await deleteDoc(doc(db, COLECAO, foto.id));
    } catch (erro) {
      console.log("Erro ao excluir registro da galeria:", erro);
      falhas++;
    }
  }

  setExcluindo(false);
  setViewerOpen(false);
  cancelarSelecao();

  if (falhas > 0) {
    Alert.alert(
      "Ops",
      "Algumas fotos não puderam ser excluídas. Verifique as permissões do Firebase."
    );
  } else {
    Alert.alert(
      "Concluído",
      "Os registros foram removidos da galeria."
    );
  }
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

  function aoTocarFoto(foto) {
    if (selecionando) {
      alternarSelecao(foto.id);
    } else {
      abrirFoto(foto.index);
    }
  }

  function aoSegurarFoto(foto) {
    if (admin && !selecionando) {
      iniciarSelecao(foto.id);
    }
  }

  function renderCard(foto) {
    const marcada = selecionadas.includes(foto.id);

    return (
      <TouchableOpacity
        key={foto.id}
        activeOpacity={0.85}
        onPress={() => aoTocarFoto(foto)}
        onLongPress={() => aoSegurarFoto(foto)}
        style={[
          styles.card,
          { height: COL_W * foto.ratio },
          selecionando && marcada && styles.cardMarcado,
        ]}
      >
        <Image source={{ uri: foto.url }} style={styles.cardImage} resizeMode="cover" />

        {selecionando && (
          <>
            {marcada && <View style={styles.cardTint} />}
            <View style={[styles.check, marcada && styles.checkMarcado]}>
              {marcada && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const qtd = selecionadas.length;
  const ocupado = enviando !== null || excluindo;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, selecionando && { paddingBottom: 110 }]}
      >
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
          {selecionando ? (
            <>
              <Text style={styles.selecionadasText}>
                {qtd} {qtd === 1 ? "selecionada" : "selecionadas"}
              </Text>

              <View style={styles.actionsButtons}>
                <TouchableOpacity onPress={selecionarTodas} style={styles.linkButton}>
                  <Text style={styles.linkButtonText}>
                    {qtd === fotos.length ? "Limpar" : "Todas"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={cancelarSelecao} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.contador}>
                {fotos.length} {fotos.length === 1 ? "foto" : "fotos"}
              </Text>

              {admin && (
                <View style={styles.actionsButtons}>
                  {fotos.length > 0 && (
                    <TouchableOpacity
                      style={styles.outlineButton}
                      onPress={() => iniciarSelecao()}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color={theme.dark ? theme.text : theme.primary}
                      />
                      <Text style={styles.outlineButtonText}>Selecionar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={adicionarFotos}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Carregando / vazio / grid */}
        {carregando ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        ) : fotos.length === 0 ? (
          <TouchableOpacity
            style={styles.empty}
            onPress={admin ? adicionarFotos : undefined}
            activeOpacity={admin ? 0.85 : 1}
          >
            <View style={styles.emptyIcon}>
              <Ionicons name="images-outline" size={34} color={theme.accent} />
            </View>
            <Text style={styles.emptyTitle}>
              {admin ? "Sua galeria está vazia" : "Em breve por aqui"}
            </Text>
            <Text style={styles.emptyText}>
              {admin
                ? "Toque aqui para escolher fotos do seu celular e mostrar os espaços do Vida Park."
                : "Estamos preparando as fotos dos nossos espaços."}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.grid}>
              <View style={styles.coluna}>{colEsq.map(renderCard)}</View>
              <View style={styles.coluna}>{colDir.map(renderCard)}</View>
            </View>

            {admin && !selecionando && (
              <Text style={styles.dica}>Segure uma foto para selecionar</Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Barra de exclusão (modo seleção) */}
      {selecionando && (
        <View style={styles.deleteBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.deleteBarTitle}>
              {qtd === 0
                ? "Toque nas fotos para selecionar"
                : `${qtd} ${qtd === 1 ? "foto selecionada" : "fotos selecionadas"}`}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => confirmarExclusao(selecionadas)}
            disabled={qtd === 0}
            activeOpacity={0.85}
            style={[styles.deleteButton, qtd === 0 && styles.deleteButtonOff]}
          >
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.deleteButtonText}>Excluir</Text>
          </TouchableOpacity>
        </View>
      )}

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
                <Image source={{ uri: item.url }} style={styles.viewerImage} resizeMode="contain" />
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
              {admin && (
                <TouchableOpacity
                  onPress={() => fotos[viewerIndex] && confirmarExclusao([fotos[viewerIndex].id])}
                  style={styles.viewerGhostButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}

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

      {/* Carregamento de envio / exclusão */}
      {ocupado && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={styles.overlayText}>
              {enviando
                ? `Enviando foto ${enviando.atual} de ${enviando.total}...`
                : "Excluindo..."}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme) {
  const textoForte = theme.dark ? theme.text : theme.primary;

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
      color: textoForte,
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
      minHeight: 68,
    },
    actionsButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    contador: {
      color: theme.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    selecionadasText: {
      color: theme.accent,
      fontSize: 14,
      fontWeight: "800",
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
    outlineButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    outlineButtonText: {
      color: textoForte,
      fontSize: 13,
      fontWeight: "700",
    },
    linkButton: {
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    linkButtonText: {
      color: theme.accent,
      fontSize: 13,
      fontWeight: "800",
    },

    // Carregando inicial
    loadingBox: {
      paddingVertical: 60,
      alignItems: "center",
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
      color: textoForte,
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
      borderWidth: 3,
      borderColor: "transparent",
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: theme.dark ? 0.35 : 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    cardMarcado: {
      borderColor: theme.accent,
    },
    cardImage: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    cardTint: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(232, 72, 144, 0.28)",
    },
    check: {
      position: "absolute",
      top: 10,
      right: 10,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: "#FFFFFF",
      backgroundColor: "rgba(0,0,0,0.25)",
      justifyContent: "center",
      alignItems: "center",
    },
    checkMarcado: {
      backgroundColor: theme.accent,
      borderColor: theme.accent,
    },
    dica: {
      color: theme.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginTop: 20,
    },

    // Barra de exclusão
    deleteBar: {
      position: "absolute",
      left: PADDING,
      right: PADDING,
      bottom: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingLeft: 18,
      paddingRight: 12,
      borderRadius: 22,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.cardShadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: theme.dark ? 0.5 : 0.18,
      shadowRadius: 16,
      elevation: 10,
    },
    deleteBarTitle: {
      color: textoForte,
      fontSize: 14,
      fontWeight: "700",
    },
    deleteButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.darkPink,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
    },
    deleteButtonOff: {
      opacity: 0.4,
    },
    deleteButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    // Overlay de envio / exclusão
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(16, 16, 36, 0.6)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 20,
    },
    overlayCard: {
      backgroundColor: theme.surface,
      paddingVertical: 28,
      paddingHorizontal: 36,
      borderRadius: 24,
      alignItems: "center",
      gap: 14,
    },
    overlayText: {
      color: textoForte,
      fontSize: 14,
      fontWeight: "700",
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