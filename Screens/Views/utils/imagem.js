// Converte uma imagem escolhida na galeria (uri file://) em texto base64 (data URI).
// Usa o expo-file-system porque o fetch() de arquivos locais falha no Android/Expo Go.
import * as FileSystem from "expo-file-system/legacy";

// O Firestore aceita no máximo ~1 MB por documento; deixamos uma folga.
const LIMITE_CARACTERES = 900000;

export async function imagemParaDataUri(uri) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const resultado = `data:image/jpeg;base64,${base64}`;
  if (resultado.length > LIMITE_CARACTERES) {
    throw new Error("A imagem é muito grande. Escolha uma imagem menor.");
  }
  return resultado;
}
