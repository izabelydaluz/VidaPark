import React, { useState, useEffect } from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { auth, db } from "../firebaseConfig";

import {
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";

import { useTheme } from "../context/ThemeContext";

// ======================================================
// REFERÊNCIA DA COLEÇÃO DE ENDEREÇOS
// users/{uid}/addresses
// ======================================================

function addressesCollection(uid) {
  if (!uid) {
    throw new Error("UID do usuário não informado.");
  }

  return collection(db, "users", uid, "addresses");
}

// ======================================================
// TELA
// ======================================================

export default function Addresses({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    label: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const { theme } = useTheme();

  const uid = auth.currentUser?.uid;

  // ======================================================
  // CARREGAR ENDEREÇOS
  // ======================================================

  useEffect(() => {
    if (!uid) {
      setAddresses([]);
      setLoading(false);

      Alert.alert(
        "Sessão necessária",
        "Faça login novamente para gerenciar seus endereços."
      );

      return;
    }

    setLoading(true);

    let unsubscribe;

    try {
      const addressesRef = addressesCollection(uid);

      unsubscribe = onSnapshot(
        addressesRef,

        (snapshot) => {
          const list = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

          list.sort((a, b) =>
            (a.createdAt || "").localeCompare(b.createdAt || "")
          );

          setAddresses(list);
          setLoading(false);
        },

        (error) => {
          console.error(
            "ERRO FIRESTORE AO CARREGAR ENDEREÇOS:",
            error
          );

          setLoading(false);

          Alert.alert(
            "Erro",
            "Não foi possível carregar seus endereços."
          );
        }
      );
    } catch (error) {
      console.error(
        "ERRO AO CRIAR REFERÊNCIA DOS ENDEREÇOS:",
        error
      );

      setLoading(false);

      Alert.alert(
        "Erro",
        error?.message || "Erro ao acessar os endereços."
      );
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [uid]);

  // ======================================================
  // ABRIR FORMULÁRIO
  // ======================================================

  function openForm(address = null) {
    if (address) {
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
      setEditingId(null);

      setForm({
        label: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
      });
    }

    setModalVisible(true);
  }

  // ======================================================
  // SELECIONAR ENDEREÇO PADRÃO
  // ======================================================

  async function handleSelect(id) {
    if (!uid) {
      Alert.alert(
        "Sessão necessária",
        "Faça login novamente."
      );
      return;
    }

    try {
      const addressesRef = addressesCollection(uid);

      const batch = writeBatch(db);

      addresses.forEach((address) => {
        const addressRef = doc(
          addressesRef,
          address.id
        );

        batch.update(addressRef, {
          selected: address.id === id,
        });
      });

      await batch.commit();

      const chosen = addresses.find(
        (address) => address.id === id
      );

      if (chosen) {
        Alert.alert(
          "Endereço padrão definido",
          `"${chosen.label}" será usado nas suas próximas compras.`
        );
      }
    } catch (error) {
      console.error(
        "ERRO AO SELECIONAR ENDEREÇO:",
        error
      );

      Alert.alert(
        "Erro",
        error?.message ||
          "Não foi possível definir o endereço padrão."
      );
    }
  }

  // ======================================================
  // SALVAR ENDEREÇO
  // ======================================================

  async function handleSave() {
    if (
      !form.street.trim() ||
      !form.number.trim() ||
      !form.city.trim()
    ) {
      Alert.alert(
        "Erro",
        "Preencha pelo menos rua, número e cidade."
      );

      return;
    }

    if (!uid) {
      Alert.alert(
        "Sessão necessária",
        "Faça login novamente para salvar endereços."
      );

      return;
    }

    try {
      const now = new Date().toISOString();

      const isFirstAddress =
        !editingId && addresses.length === 0;

      const existing = editingId
        ? addresses.find(
            (address) => address.id === editingId
          )
        : null;

      const addressData = {
        ...form,

        label:
          form.label.trim() || "Endereço",

        selected: editingId
          ? existing?.selected || false
          : isFirstAddress,

        updatedAt: now,

        createdAt:
          existing?.createdAt || now,
      };

      const addressesRef = addressesCollection(uid);

      // ==================================================
      // EDITANDO
      // ==================================================

      if (editingId) {
        const addressRef = doc(
          addressesRef,
          editingId
        );

        await setDoc(
          addressRef,
          addressData
        );
      }

      // ==================================================
      // NOVO ENDEREÇO
      // ==================================================

      else {
        await addDoc(
          addressesRef,
          addressData
        );
      }

      setModalVisible(false);
      setEditingId(null);

      Alert.alert(
        "Sucesso",
        "Endereço salvo com sucesso!"
      );
    } catch (error) {
      console.error(
        "ERRO COMPLETO AO SALVAR ENDEREÇO:",
        error
      );

      Alert.alert(
        "Erro",
        error?.message ||
          "Não foi possível salvar o endereço."
      );
    }
  }

  // ======================================================
  // CONFIRMAR EXCLUSÃO
  // ======================================================

  function handleDelete(id) {
    Alert.alert(
      "Excluir endereço",
      "Deseja realmente excluir este endereço?",

      [
        {
          text: "Cancelar",
          style: "cancel",
        },

        {
          text: "Excluir",
          style: "destructive",
          onPress: () => confirmDelete(id),
        },
      ]
    );
  }

  // ======================================================
  // EXCLUIR ENDEREÇO
  // ======================================================

  async function confirmDelete(id) {
    if (!uid) {
      Alert.alert(
        "Sessão necessária",
        "Faça login novamente."
      );

      return;
    }

    try {
      const selectedAddress = addresses.find(
        (address) => address.id === id
      );

      const wasSelected =
        selectedAddress?.selected === true;

      const remaining = addresses.filter(
        (address) => address.id !== id
      );

      const addressesRef =
        addressesCollection(uid);

      // Referência do endereço que será excluído
      const addressRef = doc(
        addressesRef,
        id
      );

      await deleteDoc(addressRef);

      // Se o endereço excluído era o padrão,
      // transforma o primeiro restante em padrão.
      if (
        wasSelected &&
        remaining.length > 0
      ) {
        const newDefaultRef = doc(
          addressesRef,
          remaining[0].id
        );

        await setDoc(
          newDefaultRef,
          {
            ...remaining[0],
            selected: true,
          }
        );
      }
    } catch (error) {
      console.error(
        "ERRO AO EXCLUIR ENDEREÇO:",
        error
      );

      Alert.alert(
        "Erro",
        error?.message ||
          "Não foi possível excluir o endereço."
      );
    }
  }

  // ======================================================
  // ENDEREÇO COMPLETO
  // ======================================================

  function getFullAddress(address) {
    return [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      address.city,
      address.state,
      address.zipCode
        ? `CEP: ${address.zipCode}`
        : "",
    ]
      .filter(Boolean)
      .join(", ");
  }

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <ActivityIndicator
          size="large"
          color={theme.primary}
        />
      </View>
    );
  }

  // ======================================================
  // TELA PRINCIPAL
  // ======================================================

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.primary}
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.headerTitle,
            {
              color: theme.primary,
            },
          ]}
        >
          Meus Endereços
        </Text>

        <View style={{ width: 24 }} />
      </View>

      {/* LISTA */}

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="location-outline"
            size={80}
            color={theme.accent}
          />

          <Text
            style={[
              styles.emptyText,
              {
                color: theme.primary,
              },
            ]}
          >
            Nenhum endereço cadastrado
          </Text>

          <Text
            style={[
              styles.emptySubtext,
              {
                color: theme.textMuted,
              },
            ]}
          >
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
                {
                  backgroundColor:
                    theme.surface,
                },

                item.selected && {
                  borderWidth: 2,
                  borderColor:
                    theme.primary,
                },
              ]}
            >
              <View
                style={styles.addressHeader}
              >
                <View
                  style={styles.addressLabelRow}
                >
                  <TouchableOpacity
                    onPress={() =>
                      handleSelect(item.id)
                    }
                    hitSlop={{
                      top: 8,
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }}
                  >
                    <Ionicons
                      name={
                        item.selected
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>

                  <Ionicons
                    name="location"
                    size={18}
                    color={theme.primary}
                  />

                  <Text
                    style={[
                      styles.addressLabel,
                      {
                        color:
                          theme.primary,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>

                  {item.selected && (
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor:
                            theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={styles.badgeText}
                      >
                        Padrão
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={styles.addressActions}
                >
                  <TouchableOpacity
                    onPress={() =>
                      openForm(item)
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={theme.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      handleDelete(item.id)
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color="#f44336"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <Text
                style={[
                  styles.addressText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {getFullAddress(item)}
              </Text>

              {!item.selected && (
                <TouchableOpacity
                  onPress={() =>
                    handleSelect(item.id)
                  }
                  style={styles.selectLink}
                >
                  <Text
                    style={{
                      color: theme.primary,
                      fontWeight: "bold",
                      fontSize: 13,
                    }}
                  >
                    Usar este endereço
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* BOTÃO ADICIONAR */}

      <TouchableOpacity
        style={[
          styles.addButton,
          {
            backgroundColor:
              theme.primary,
          },
        ]}
        onPress={() => openForm()}
      >
        <Ionicons
          name="add"
          size={24}
          color="#fff"
        />

        <Text
          style={styles.addButtonText}
        >
          Adicionar endereço
        </Text>
      </TouchableOpacity>

      {/* MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor:
                  theme.surface,
              },
            ]}
          >
            <View
              style={styles.modalHeader}
            >
              <Text
                style={[
                  styles.modalTitle,
                  {
                    color:
                      theme.primary,
                  },
                ]}
              >
                {editingId
                  ? "Editar Endereço"
                  : "Novo Endereço"}
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setModalVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={theme.primary}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    theme.background,
                  color: theme.text,
                  borderColor:
                    theme.accent,
                },
              ]}
              value={form.label}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  label: text,
                })
              }
              placeholder="Nome do endereço (ex: Casa, Trabalho)"
              placeholderTextColor={
                theme.textMuted
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    theme.background,
                  color: theme.text,
                  borderColor:
                    theme.accent,
                },
              ]}
              value={form.street}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  street: text,
                })
              }
              placeholder="Rua *"
              placeholderTextColor={
                theme.textMuted
              }
            />

            <View style={styles.row}>
              <TextInput
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor:
                      theme.background,
                    color: theme.text,
                    borderColor:
                      theme.accent,
                  },
                ]}
                value={form.number}
                onChangeText={(text) =>
                  setForm({
                    ...form,
                    number: text,
                  })
                }
                placeholder="Número *"
                placeholderTextColor={
                  theme.textMuted
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor:
                      theme.background,
                    color: theme.text,
                    borderColor:
                      theme.accent,
                  },
                ]}
                value={form.complement}
                onChangeText={(text) =>
                  setForm({
                    ...form,
                    complement: text,
                  })
                }
                placeholder="Complemento"
                placeholderTextColor={
                  theme.textMuted
                }
              />
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    theme.background,
                  color: theme.text,
                  borderColor:
                    theme.accent,
                },
              ]}
              value={form.neighborhood}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  neighborhood: text,
                })
              }
              placeholder="Bairro"
              placeholderTextColor={
                theme.textMuted
              }
            />

            <View style={styles.row}>
              <TextInput
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor:
                      theme.background,
                    color: theme.text,
                    borderColor:
                      theme.accent,
                  },
                ]}
                value={form.city}
                onChangeText={(text) =>
                  setForm({
                    ...form,
                    city: text,
                  })
                }
                placeholder="Cidade *"
                placeholderTextColor={
                  theme.textMuted
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor:
                      theme.background,
                    color: theme.text,
                    borderColor:
                      theme.accent,
                  },
                ]}
                value={form.state}
                onChangeText={(text) =>
                  setForm({
                    ...form,
                    state: text.toUpperCase(),
                  })
                }
                placeholder="UF"
                placeholderTextColor={
                  theme.textMuted
                }
                maxLength={2}
              />
            </View>

            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor:
                    theme.background,
                  color: theme.text,
                  borderColor:
                    theme.accent,
                },
              ]}
              value={form.zipCode}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  zipCode: text,
                })
              }
              placeholder="CEP"
              placeholderTextColor={
                theme.textMuted
              }
              keyboardType="numeric"
              maxLength={9}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  backgroundColor:
                    theme.primary,
                },
              ]}
              onPress={handleSave}
            >
              <Text
                style={styles.saveButtonText}
              >
                Salvar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ======================================================
// ESTILOS
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },

  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },

  list: {
    padding: 16,
    gap: 12,
  },

  addressCard: {
    borderRadius: 16,
    padding: 16,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 2,
  },

  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  addressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },

  addressLabel: {
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
  },

  addressActions: {
    flexDirection: "row",
    gap: 12,
  },

  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },

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

  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },

  input: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  halfInput: {
    flex: 1,
  },

  saveButton: {
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 8,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  selectLink: {
    marginTop: 8,
    alignSelf: "flex-start",
  },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },

  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
});