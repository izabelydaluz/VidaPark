// services/mercadopago.js
//
// Centraliza a URL do servidor de pagamento e a chamada HTTP.
// Se trocar o servidor, só precisa atualizar a URL aqui.

const FUNCTIONS_URL = "https://vidapark.onrender.com";

// O Render (plano grátis) hiberna quando fica sem uso e a primeira chamada
// pode levar de 30 a 60 segundos. Por isso o tempo limite é generoso.
const TIMEOUT_MS = 60000;

// Chamada "à toa" só para acordar o servidor antes do cliente pagar.
// Qualquer resposta (até 404) serve; erros são ignorados.
export function acordarServidor() {
  fetch(FUNCTIONS_URL, { method: "GET" }).catch(() => {});
}

export async function callFunction(name, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;

  try {
    response = await fetch(`${FUNCTIONS_URL}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error("O servidor demorou para responder. Tente novamente em instantes.");
    }
    throw new Error("Sem conexão com o servidor de pagamento. Verifique a internet e tente novamente.");
  } finally {
    clearTimeout(timer);
  }

  // Lê como texto primeiro: quando o servidor está fora do ar, o Render responde
  // com uma página HTML e o response.json() quebraria com um erro confuso.
  const texto = await response.text();

  let result = null;
  try {
    result = JSON.parse(texto);
  } catch (e) {
    // não é JSON
  }

  if (!result) {
    console.log(`[${name}] resposta inválida (HTTP ${response.status}):`, texto.slice(0, 300));
    throw new Error(
      `O servidor de pagamento não respondeu corretamente (HTTP ${response.status}). Tente novamente em instantes.`
    );
  }

  if (result.error || !response.ok) {
    // O log completo ajuda a descobrir a causa real do erro do Mercado Pago
    console.log(`[${name}] erro (HTTP ${response.status}):`, JSON.stringify(result).slice(0, 800));
  }

  if (result.error) {
    throw new Error(result.error.message || "Erro desconhecido");
  }

  if (!response.ok) {
    throw new Error(`Erro no servidor de pagamento (HTTP ${response.status}).`);
  }

  return result;
}