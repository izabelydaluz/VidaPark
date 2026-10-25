// Saída da conta, compartilhada pelas telas que têm botão "Sair" (Perfil, Configurações...).
import { Alert } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../../../Firebase/firebaseConfig";

// Pergunta se o usuário quer sair; se sim, desloga e vai para o Login limpando o histórico
// de navegação (assim o botão "voltar" do Android não retorna ao app já deslogado).
// aoSair (opcional) roda logo depois do logout, antes de navegar.
export function confirmarSaida(navigation, aoSair) {
  Alert.alert("Sair da conta", "Deseja realmente sair?", [
    { text: "Cancelar", style: "cancel" },
    {
      text: "Sair",
      style: "destructive",
      onPress: async () => {
        try {
          await signOut(auth);
          aoSair?.();
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        } catch {
          Alert.alert("Erro", "Não foi possível sair da conta. Tente novamente.");
        }
      },
    },
  ]);
}
