import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTheme } from "../../../context/ThemeContext";
import { geocodificar, textoBusca, buscarCep } from "./taxaEntrega";

import { auth, db } from "../../../Firebase/firebaseConfig";
import { collection, onSnapshot, doc, setDoc, addDoc, writeBatch } from "firebase/firestore";

// ======================================================
// DADOS AUXILIARES
// ======================================================

const FORM_VAZIO = {
  label: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zipCode: "",
};

const UF_POR_NOME = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE",
  "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA",
  "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", para: "PA",
  paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ",
  "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};
const UFS = Object.values(UF_POR_NOME);

// "Santa Catarina" -> "SC" (o Android devolve o nome completo do estado)
function paraUF(regiao) {
  if (!regiao) return "";
  const limpo = String(regiao).trim();
  if (limpo.length === 2) return limpo.toUpperCase();
  const semAcento = limpo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return UF_POR_NOME[semAcento] || "";
}

function mascaraCep(texto) {
  const d = texto.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Tira espaços sobrando e padroniza antes de comparar/salvar
function limparFormulario(f) {
  return {
    label: f.label.trim(),
    street: f.street.trim(),
    number: f.number.trim(),
    complement: f.complement.trim(),
    neighborhood: f.neighborhood.trim(),
    city: f.city.trim(),
    state: f.state.trim().toUpperCase(),
    zipCode: f.zipCode.trim(),
  };
}

// Alert que devolve true/false conforme o botão escolhido
function confirmar(titulo, mensagem, textoConfirmar) {
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensagem,
      [
        { text: "Cancelar", style: "cancel", onPress: () => resolve(false) },
        { text: textoConfirmar, onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

function addressesCollection(uid) {
  if (!uid) throw new Error("UID do usuário não informado.");
  return collection(db, "users", uid, "addresses");
}

// Campo de texto do formulário (fora da tela para não ser recriado a cada digitação)
function Campo({ theme, style, ...props }) {
  return (
    <TextInput
      style={[
        styles.input,
        { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent },
        style,
      ]}
      placeholderTextColor={theme.textMuted}
      {...props}
    />
  );
}

// ======================================================
// TELA
// ======================================================

export default function Addresses({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [gps, setGps] = useState(null); // { latitude, longitude, texto, aproximado }
  const [buscandoGps, setBuscandoGps] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(FORM_VAZIO);

  const salvandoRef = useRef(false);
  const { theme } = useTheme();
  const uid = auth.currentUser?.uid;

  const setCampo = (campo) => (texto) => setForm((f) => ({ ...f, [campo]: texto }));

  // ======================================================
  // CARREGAR ENDEREÇOS (tempo real)
  // ======================================================

  useEffect(() => {
    if (!uid) {
      setAddresses([]);
      setLoading(false);
      Alert.alert("Sessão necessária", "Faça login novamente para gerenciar seus endereços.");
      return;
    }

    setLoading(true);
    let unsubscribe;

    try {
      unsubscribe = onSnapshot(
        addressesCollection(uid),
        (snapshot) => {
          const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
          list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
          setAddresses(list);
          setLoading(false);
        },
        () => {
          setLoading(false);
          Alert.alert("Erro", "Não foi possível carregar seus endereços. Verifique sua conexão.");
        }
      );
    } catch {
      setLoading(false);
      Alert.alert("Erro", "Não foi possível acessar seus endereços.");
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [uid]);

  // ======================================================
  // FORMULÁRIO
  // ======================================================

  function openForm(address = null) {
    if (address) {
      setGps(
        address.latitude != null
          ? {
              latitude: address.latitude,
              longitude: address.longitude,
              texto: textoBusca(address),
              aproximado: !!address.localizacaoAproximada,
            }
          : null
      );
      setEditingId(address.id);
      setForm({
        label: address.label || "",
        street: address.street || "",
        number: address.number || "",
        complement: address.complement || "",
        neighborhood: address.neighborhood || "",
        city: address.city || "",
        state: address.state || "",
        zipCode: address.zipCode || "",
      });
    } else {
      setGps(null);
      setEditingId(null);
      setForm(FORM_VAZIO);
    }
    setModalVisible(true);
  }

  function closeForm() {
    if (salvandoRef.current) return;
    setModalVisible(false);
  }

  // Ao completar o CEP, preenche rua/bairro/cidade/UF que ainda estiverem vazios
  async function aoMudarCep(texto) {
    const cep = mascaraCep(texto);
    setForm((f) => ({ ...f, zipCode: cep }));

    if (cep.replace(/\D/g, "").length !== 8) return;

    const dados = await buscarCep(cep);
    if (!dados) return;

    setForm((f) => ({
      ...f,
      street: f.street || dados.logradouro || "",
      neighborhood: f.neighborhood || dados.bairro || "",
      city: f.city || dados.localidade || "",
      state: f.state || (dados.uf || "").toUpperCase(),
    }));
  }

  // ======================================================
  // ENDEREÇO PADRÃO
  // ======================================================

  async function handleSelect(id) {
    if (!uid) {
      Alert.alert("Sessão necessária", "Faça login novamente.");
      return;
    }

    const chosen = addresses.find((a) => a.id === id);
    if (!chosen || chosen.selected) return;

    try {
      const addressesRef = addressesCollection(uid);
      const batch = writeBatch(db);

      // só atualiza o que realmente muda (o novo padrão e o antigo)
      addresses.forEach((address) => {
        const deveSerPadrao = address.id === id;
        if ((address.selected === true) !== deveSerPadrao) {
          batch.update(doc(addressesRef, address.id), { selected: deveSerPadrao });
        }
      });

      await batch.commit();

      Alert.alert("Endereço padrão definido", `"${chosen.label}" será usado nas suas próximas compras.`);
    } catch {
      Alert.alert("Erro", "Não foi possível definir o endereço padrão. Tente novamente.");
    }
  }

  // ======================================================
  // USAR LOCALIZAÇÃO (GPS)
  // ======================================================

  async function usarMinhaLocalizacao() {
    try {
      setBuscandoGps(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Ative a localização para usar este recurso.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;

      const [end] = await Location.reverseGeocodeAsync({ latitude, longitude });

      const novo = {
        ...form,
        street: end?.street || form.street,
        number: end?.streetNumber || form.number,
        neighborhood: end?.district || end?.subregion || form.neighborhood,
        city: end?.city || form.city,
        state: paraUF(end?.region) || form.state,
        zipCode: end?.postalCode ? mascaraCep(end.postalCode) : form.zipCode,
      };

      setForm(novo);
      setGps({ latitude, longitude, texto: textoBusca(limparFormulario(novo)), aproximado: false });

      Alert.alert("Localização encontrada", "Confira os dados e complete o que estiver faltando.");
    } catch {
      Alert.alert("Erro", "Não foi possível obter sua localização.");
    } finally {
      setBuscandoGps(false);
    }
  }

  // ======================================================
  // SALVAR
  // ======================================================

  async function handleSave() {
    if (salvandoRef.current) return;

    const dados = limparFormulario(form);

    if (!dados.street || !dados.number || !dados.city) {
      Alert.alert("Erro", "Preencha pelo menos rua, número e cidade.");
      return;
    }
    if (dados.state && !UFS.includes(dados.state)) {
      Alert.alert("Erro", "UF inválida. Use a sigla do estado, por exemplo SC.");
      return;
    }
    if (dados.zipCode && dados.zipCode.replace(/\D/g, "").length !== 8) {
      Alert.alert("Erro", "CEP inválido. Digite os 8 números ou deixe em branco.");
      return;
    }
    if (!uid) {
      Alert.alert("Sessão necessária", "Faça login novamente para salvar endereços.");
      return;
    }

    salvandoRef.current = true;
    setSalvando(true);

    try {
      // Reaproveita as coordenadas (GPS ou já salvas) se o endereço não mudou
      const reaproveita = gps && gps.texto === textoBusca(dados);
      const coords = reaproveita
        ? { latitude: gps.latitude, longitude: gps.longitude, aproximado: gps.aproximado }
        : await geocodificar(dados);

      if (!coords) {
        Alert.alert(
          "Endereço não encontrado",
          'Confira rua, número e cidade, ou use o botão "Usar minha localização".'
        );
        return;
      }

      // Só achou o bairro/cidade, não a rua: avisa que o frete será uma estimativa
      if (!reaproveita && coords.aproximado) {
        const seguir = await confirmar(
          "Localização aproximada",
          "Não encontramos esta rua exatamente. Vamos usar a região do bairro/cidade para estimar o frete, e o valor pode mudar. Salvar mesmo assim?",
          "Salvar"
        );
        if (!seguir) return;
      }

      const now = new Date().toISOString();
      const existing = editingId ? addresses.find((a) => a.id === editingId) : null;
      const isFirstAddress = !editingId && addresses.length === 0;

      const addressData = {
        ...dados,
        label: dados.label || "Endereço",
        latitude: coords.latitude,
        longitude: coords.longitude,
        localizacaoAproximada: !!coords.aproximado,
        selected: editingId ? existing?.selected || false : isFirstAddress,
        updatedAt: now,
        createdAt: existing?.createdAt || now,
      };

      const addressesRef = addressesCollection(uid);

      if (editingId) {
        await setDoc(doc(addressesRef, editingId), addressData);
      } else {
        await addDoc(addressesRef, addressData);
      }

      setModalVisible(false);
      setEditingId(null);
      Alert.alert("Sucesso", "Endereço salvo com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar o endereço. Verifique sua conexão e tente novamente.");
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  }

  // ======================================================
  // EXCLUIR
  // ======================================================

  function handleDelete(id) {
    Alert.alert("Excluir endereço", "Deseja realmente excluir este endereço?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => confirmDelete(id) },
    ]);
  }

  async function confirmDelete(id) {
    if (!uid) {
      Alert.alert("Sessão necessária", "Faça login novamente.");
      return;
    }

    try {
      const wasSelected = addresses.find((a) => a.id === id)?.selected === true;
      const remaining = addresses.filter((a) => a.id !== id);
      const addressesRef = addressesCollection(uid);

      // Tudo em um único lote: ou exclui e promove o novo padrão, ou não faz nada.
      const batch = writeBatch(db);
      batch.delete(doc(addressesRef, id));

      if (wasSelected && remaining.length > 0) {
        batch.update(doc(addressesRef, remaining[0].id), { selected: true });
      }

      await batch.commit();
    } catch {
      Alert.alert("Erro", "Não foi possível excluir o endereço. Tente novamente.");
    }
  }

  function getFullAddress(address) {
    return [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.zipCode ? `CEP: ${address.zipCode}` : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  // ======================================================
  // RENDER
  // ======================================================

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const area = { top: 10, bottom: 10, left: 10, right: 10 };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={area}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: theme.primary }]}>Meus Endereços</Text>

        <View style={{ width: 24 }} />
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={80} color={theme.accent} />
          <Text style={[styles.emptyText, { color: theme.primary }]}>Nenhum endereço cadastrado</Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
            Adicione um endereço para suas entregas.
          </Text>
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View
              style={[
                styles.addressCard,
                { backgroundColor: theme.surface },
                item.selected && { borderWidth: 2, borderColor: theme.primary },
              ]}
            >
              <View style={styles.addressHeader}>
                <View style={styles.addressLabelRow}>
                  <TouchableOpacity
                    onPress={() => handleSelect(item.id)}
                    hitSlop={area}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: !!item.selected }}
                    accessibilityLabel={`Usar ${item.label} como endereço padrão`}
                  >
                    <Ionicons
                      name={item.selected ? "radio-button-on" : "radio-button-off"}
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>

                  <Ionicons name="location" size={18} color={theme.primary} />

                  <Text style={[styles.addressLabel, { color: theme.primary }]}>{item.label}</Text>

                  {item.selected && (
                    <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                      <Text style={styles.badgeText}>Padrão</Text>
                    </View>
                  )}
                </View>

                <View style={styles.addressActions}>
                  <TouchableOpacity
                    onPress={() => openForm(item)}
                    hitSlop={area}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${item.label}`}
                  >
                    <Ionicons name="create-outline" size={22} color={theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={area}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir ${item.label}`}
                  >
                    <Ionicons name="trash-outline" size={22} color="#f44336" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.addressText, { color: theme.textSecondary }]}>{getFullAddress(item)}</Text>

              {item.localizacaoAproximada ? (
                <Text style={[styles.avisoAprox, { color: theme.textMuted }]}>
                  Localização aproximada: o valor do frete pode variar.
                </Text>
              ) : null}

              {!item.selected && (
                <TouchableOpacity onPress={() => handleSelect(item.id)} style={styles.selectLink}>
                  <Text style={{ color: theme.primary, fontWeight: "bold", fontSize: 13 }}>Usar este endereço</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        onPress={() => openForm()}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar endereço</Text>
      </TouchableOpacity>

      {/* FORMULÁRIO */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>
                {editingId ? "Editar Endereço" : "Novo Endereço"}
              </Text>

              <TouchableOpacity
                onPress={closeForm}
                hitSlop={area}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Ionicons name="close" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.gpsButton, { borderColor: theme.primary }]}
                onPress={usarMinhaLocalizacao}
                disabled={buscandoGps || salvando}
              >
                {buscandoGps ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={18} color={theme.primary} />
                    <Text style={{ color: theme.primary, fontWeight: "700" }}>Usar minha localização</Text>
                  </>
                )}
              </TouchableOpacity>

              <Campo
                theme={theme}
                value={form.label}
                onChangeText={setCampo("label")}
                placeholder="Nome do endereço (ex: Casa, Trabalho)"
              />

              <Campo
                theme={theme}
                value={form.zipCode}
                onChangeText={aoMudarCep}
                placeholder="CEP (preenche o endereço sozinho)"
                keyboardType="numeric"
                maxLength={9}
              />

              <Campo theme={theme} value={form.street} onChangeText={setCampo("street")} placeholder="Rua *" />

              <View style={styles.row}>
                <Campo
                  theme={theme}
                  style={styles.halfInput}
                  value={form.number}
                  onChangeText={setCampo("number")}
                  placeholder="Número *"
                />
                <Campo
                  theme={theme}
                  style={styles.halfInput}
                  value={form.complement}
                  onChangeText={setCampo("complement")}
                  placeholder="Complemento"
                />
              </View>

              <Campo
                theme={theme}
                value={form.neighborhood}
                onChangeText={setCampo("neighborhood")}
                placeholder="Bairro"
              />

              <View style={styles.row}>
                <Campo
                  theme={theme}
                  style={styles.halfInput}
                  value={form.city}
                  onChangeText={setCampo("city")}
                  placeholder="Cidade *"
                />
                <Campo
                  theme={theme}
                  style={styles.halfInput}
                  value={form.state}
                  onChangeText={(t) => setCampo("state")(t.toUpperCase())}
                  placeholder="UF"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }, salvando && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={salvando}
              >
                {salvando ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ======================================================
// ESTILOS
// ======================================================

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
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
  list: { padding: 16, gap: 12 },
  addressCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addressLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  addressLabel: { fontSize: 16, fontWeight: "bold", flexShrink: 1 },
  addressActions: { flexDirection: "row", gap: 16 },
  addressText: { fontSize: 14, lineHeight: 20 },
  avisoAprox: { fontSize: 12, marginTop: 6, fontStyle: "italic" },
  addButton: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  saveButton: { padding: 16, borderRadius: 30, alignItems: "center", marginTop: 8, marginBottom: 8 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  selectLink: { marginTop: 8, alignSelf: "flex-start" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
});
