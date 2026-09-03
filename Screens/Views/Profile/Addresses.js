import React, { useState, useEffect } from "react";
import { View,Text,StyleSheet,FlatList,TouchableOpacity,Alert,TextInput,Modal,ActivityIndicator} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useTheme } from "../../../context/ThemeContext";

const ADDRESSES_FILE = `${FileSystem.documentDirectory}bellaplus_addresses.json`;

export default function Addresses({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    label: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "", zipCode: "",
  });
  const { theme } = useTheme();

  useEffect(() => { loadAddresses(); }, []);

  async function loadAddresses() {
    try {
      const info = await FileSystem.getInfoAsync(ADDRESSES_FILE);
      if (info.exists) {
        const data = await FileSystem.readAsStringAsync(ADDRESSES_FILE);
        setAddresses(JSON.parse(data));
      }
    } catch (e) {
      console.error("Erro ao carregar enderecos:", e);
    } finally {
      setLoading(false);
    }
  }

  async function saveAddresses(newAddresses) {
    setAddresses(newAddresses);
    await FileSystem.writeAsStringAsync(ADDRESSES_FILE, JSON.stringify(newAddresses));
  }

  function openForm(address = null) {
    if (address) {
      setEditingId(address.id);
      setForm({ label: address.label || "", street: address.street || "", number: address.number || "", complement: address.complement || "", neighborhood: address.neighborhood || "", city: address.city || "", state: address.state || "", zipCode: address.zipCode || "" });
    } else {
      setEditingId(null);
      setForm({ label: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" });
    }
    setModalVisible(true);
  }

  function handleSave() {
    if (!form.street.trim() || !form.number.trim() || !form.city.trim()) {
      Alert.alert("Erro", "Preencha pelo menos rua, numero e cidade.");
      return;
    }
    const addressData = { id: editingId || Date.now().toString(), ...form, label: form.label.trim() || "Endereco", updatedAt: new Date().toISOString() };
    const updated = editingId ? addresses.map((a) => a.id === editingId ? addressData : a) : [...addresses, addressData];
    saveAddresses(updated);
    setModalVisible(false);
    Alert.alert("Sucesso", "Endereco salvo com sucesso!");
  }

  function handleDelete(id) {
    Alert.alert("Excluir endereco", "Deseja realmente excluir este endereco?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => saveAddresses(addresses.filter((a) => a.id !== id)) },
    ]);
  }

  function getFullAddress(addr) {
    return [addr.street, addr.number, addr.complement, addr.neighborhood, addr.city, addr.state, addr.zipCode ? `CEP: ${addr.zipCode}` : ""].filter(Boolean).join(", ");
  }

  if (loading) {
    return <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.primary }]}>Meus Enderecos</Text>
        <View style={{ width: 24 }} />
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={80} color={theme.accent} />
          <Text style={[styles.emptyText, { color: theme.primary }]}>Nenhum endereco cadastrado</Text>
          <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>Adicione um endereco para suas entregas.</Text>
        </View>
      ) : (
        <FlatList data={addresses} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.addressCard, { backgroundColor: theme.surface }]}>
              <View style={styles.addressHeader}>
                <View style={styles.addressLabelRow}>
                  <Ionicons name="location" size={18} color={theme.primary} />
                  <Text style={[styles.addressLabel, { color: theme.primary }]}>{item.label}</Text>
                </View>
                <View style={styles.addressActions}>
                  <TouchableOpacity onPress={() => openForm(item)}><Ionicons name="create-outline" size={20} color={theme.primary} /></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}><Ionicons name="trash-outline" size={20} color="#f44336" /></TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.addressText, { color: theme.textSecondary }]}>{getFullAddress(item)}</Text>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={[styles.addButton, { backgroundColor: theme.primary }]} onPress={() => openForm()}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Adicionar endereco</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>{editingId ? "Editar Endereco" : "Novo Endereco"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.label} onChangeText={(t) => setForm({ ...form, label: t })} placeholder="Nome do endereco (ex: Casa, Trabalho)" placeholderTextColor={theme.textMuted} />
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.street} onChangeText={(t) => setForm({ ...form, street: t })} placeholder="Rua *" placeholderTextColor={theme.textMuted} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.number} onChangeText={(t) => setForm({ ...form, number: t })} placeholder="Numero *" placeholderTextColor={theme.textMuted} />
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.complement} onChangeText={(t) => setForm({ ...form, complement: t })} placeholder="Complemento" placeholderTextColor={theme.textMuted} />
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.neighborhood} onChangeText={(t) => setForm({ ...form, neighborhood: t })} placeholder="Bairro" placeholderTextColor={theme.textMuted} />
            <View style={styles.row}>
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.city} onChangeText={(t) => setForm({ ...form, city: t })} placeholder="Cidade *" placeholderTextColor={theme.textMuted} />
              <TextInput style={[styles.input, styles.halfInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.state} onChangeText={(t) => setForm({ ...form, state: t })} placeholder="UF" placeholderTextColor={theme.textMuted} maxLength={2} />
            </View>
            <TextInput style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.accent }]} value={form.zipCode} onChangeText={(t) => setForm({ ...form, zipCode: t })} placeholder="CEP" placeholderTextColor={theme.textMuted} keyboardType="numeric" maxLength={9} />
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.primary }]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: "bold", marginTop: 16 },
  emptySubtext: { fontSize: 14, textAlign: "center", marginTop: 8 },
  list: { padding: 16, gap: 12 },
  addressCard: { borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  addressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  addressLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressLabel: { fontSize: 16, fontWeight: "bold" },
  addressActions: { flexDirection: "row", gap: 12 },
  addressText: { fontSize: 14, lineHeight: 20 },
  addButton: { flexDirection: "row", marginHorizontal: 16, marginBottom: 30, padding: 16, borderRadius: 30, alignItems: "center", justifyContent: "center", gap: 8 },
  addButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "bold" },
  input: { borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  halfInput: { flex: 1 },
  saveButton: { padding: 16, borderRadius: 30, alignItems: "center", marginTop: 8 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
