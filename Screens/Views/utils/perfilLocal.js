// Foto de perfil guardada no aparelho, separada por usuário (uid).
// O nome do usuário fica no Firestore (usuarios/{uid}.nome); aqui fica só a foto.
import * as FileSystem from "expo-file-system/legacy";

const pasta = FileSystem.documentDirectory;
const arquivoPerfil = (uid) => `${pasta}perfil_${uid}.json`;

// Retorna o caminho completo da foto do usuário, ou null se não houver (ou se o arquivo sumiu).
export async function lerFotoLocal(uid) {
  if (!uid) return null;
  try {
    const caminhoJson = arquivoPerfil(uid);
    const info = await FileSystem.getInfoAsync(caminhoJson);
    if (!info.exists) return null;

    const dados = JSON.parse(await FileSystem.readAsStringAsync(caminhoJson));
    if (!dados.foto) return null;

    // guardamos só o nome do arquivo: o caminho da pasta do app pode mudar (ex.: atualização no iOS)
    const caminhoFoto = `${pasta}${dados.foto}`;
    const infoFoto = await FileSystem.getInfoAsync(caminhoFoto);
    return infoFoto.exists ? caminhoFoto : null;
  } catch {
    return null;
  }
}

// Copia a imagem escolhida (que está no cache do aparelho) para a pasta do app,
// registra como foto do usuário e apaga a foto anterior.
// Passe null em uriNova para remover a foto.
export async function salvarFotoLocal(uid, uriNova) {
  if (!uid) throw new Error("Usuário não identificado.");

  const anterior = await lerFotoLocal(uid);
  let nomeNovo = null;

  if (uriNova) {
    nomeNovo = `perfil_${uid}_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uriNova, to: `${pasta}${nomeNovo}` });
  }

  await FileSystem.writeAsStringAsync(arquivoPerfil(uid), JSON.stringify({ foto: nomeNovo }));

  if (anterior) {
    await FileSystem.deleteAsync(anterior, { idempotent: true }).catch(() => {});
  }

  return nomeNovo ? `${pasta}${nomeNovo}` : null;
}
