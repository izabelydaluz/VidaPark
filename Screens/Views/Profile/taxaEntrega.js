import * as Location from "expo-location";

// ======================================================
// CONFIGURAÇÃO DA ENTREGA (ajuste aqui se a regra mudar)
// ======================================================
const LOJA = { latitude: -28.4735, longitude: -49.0215 };

const VALOR_POR_KM = 3.0; // R$ por km cobrado
const KM_GRATIS = 5; // até 5 km a entrega é grátis; só o que passar disso é cobrado
const RAIO_MAX_KM = 30; // acima disso o endereço fica fora da área de entrega (confirmar com a loja)

const TIMEOUT_REDE_MS = 8000;

export const CONFIG_ENTREGA = { LOJA, VALOR_POR_KM, KM_GRATIS, RAIO_MAX_KM };

export function textoBusca(a) {
  return [
    [a.street, a.number].filter(Boolean).join(", "),
    a.neighborhood,
    a.city,
    a.state,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
}

// fetch com tempo limite: evita a tela ficar travada se o serviço não responder
async function fetchComTimeout(url, options = {}, ms = TIMEOUT_REDE_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function nominatim(q) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=" +
      encodeURIComponent(q);
    const res = await fetchComTimeout(url, {
      headers: { "User-Agent": "VidaParkApp/1.0", "Accept-Language": "pt-BR" },
    });
    const json = await res.json();
    if (Array.isArray(json) && json.length) {
      return { latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) };
    }
  } catch {
    // serviço fora do ar ou sem resposta: tenta a próxima alternativa
  }
  return null;
}

// Consulta o CEP no ViaCEP. Retorna { logradouro, bairro, localidade, uf, ... } ou null.
export async function buscarCep(cep) {
  try {
    const limpo = String(cep || "").replace(/\D/g, "");
    if (limpo.length !== 8) return null;
    const res = await fetchComTimeout(`https://viacep.com.br/ws/${limpo}/json/`);
    const json = await res.json();
    return json.erro ? null : json;
  } catch {
    return null;
  }
}

// Retorna { latitude, longitude, aproximado } ou null se não achou.
// aproximado = true quando só foi possível localizar o bairro/cidade (não a rua).
export async function geocodificar(a) {
  const exatas = [textoBusca(a)];

  const cep = await buscarCep(a.zipCode);
  if (cep?.logradouro) {
    exatas.push(
      [cep.logradouro, a.number, cep.bairro, cep.localidade, cep.uf, "Brasil"].filter(Boolean).join(", ")
    );
    exatas.push([cep.logradouro, cep.bairro, cep.localidade, cep.uf, "Brasil"].filter(Boolean).join(", "));
  }
  exatas.push([a.street, a.city, a.state, "Brasil"].filter(Boolean).join(", "));

  const aproximadas = [
    [a.neighborhood, a.city, a.state, "Brasil"].filter(Boolean).join(", "),
    [a.city, a.state, "Brasil"].filter(Boolean).join(", "),
  ];

  const tentativas = [
    ...exatas.map((q) => ({ q, aproximado: false })),
    ...aproximadas.map((q) => ({ q, aproximado: true })),
  ];

  for (const { q, aproximado } of tentativas) {
    const n = await nominatim(q);
    if (n) return { ...n, aproximado };
    // Nominatim pede no máximo ~1 pedido por segundo
    await new Promise((r) => setTimeout(r, 1100));
  }

  // último recurso: geocoder do aparelho
  try {
    const r = await Location.geocodeAsync(exatas[0]);
    if (r.length) {
      return { latitude: r[0].latitude, longitude: r[0].longitude, aproximado: false };
    }
  } catch {
    // sem resultado
  }

  return null;
}

function linhaReta(a, b) {
  const R = 6371;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Distância real por ruas (OSRM). Se falhar, usa linha reta x 1,3 e marca como estimada.
async function distanciaRotaKm(destino) {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${LOJA.longitude},${LOJA.latitude};${destino.longitude},${destino.latitude}` +
      `?overview=false`;

    const res = await fetchComTimeout(url);
    const json = await res.json();

    if (json?.routes?.length) {
      return { km: json.routes[0].distance / 1000, estimada: false };
    }
  } catch {
    // cai na estimativa abaixo
  }
  return { km: linhaReta(LOJA, destino) * 1.3, estimada: true };
}

// Use com await. Retorna:
//  km         distância até o endereço
//  taxa       valor da entrega (R$), arredondado para múltiplos de R$ 0,50
//  estimada   true se a distância é aproximada (serviço de rotas indisponível)
//  foraDaArea true se passa do raio máximo de entrega
export async function calcularTaxa(destino) {
  const { km, estimada } = await distanciaRotaKm(destino);
  const cobrados = Math.max(0, km - KM_GRATIS);
  const taxa = Math.round(cobrados * VALOR_POR_KM * 2) / 2;
  return { km, taxa, estimada, foraDaArea: km > RAIO_MAX_KM };
}
