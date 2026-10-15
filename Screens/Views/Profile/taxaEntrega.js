import * as Location from "expo-location";

const LOJA = { latitude:  -28.4735, longitude:  -49.0215  };

const VALOR_POR_KM = 3.0;  // exemplo: 5 km = R$ 15,00
const KM_GRATIS = 5;     // até 5 km não paga
const TAXA_MINIMA = 0;

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

async function nominatim(q) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=" +
      encodeURIComponent(q);
    const res = await fetch(url, {
      headers: { "User-Agent": "VidaParkApp/1.0", "Accept-Language": "pt-BR" },
    });
    const json = await res.json();
    if (Array.isArray(json) && json.length) {
      return { latitude: parseFloat(json[0].lat), longitude: parseFloat(json[0].lon) };
    }
  } catch (e) {
    console.log("Erro Nominatim:", e?.message);
  }
  return null;
}

async function viaCep(cep) {
  try {
    const limpo = String(cep || "").replace(/\D/g, "");
    if (limpo.length !== 8) return null;
    const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const json = await res.json();
    return json.erro ? null : json;
  } catch (e) {
    console.log("Erro ViaCEP:", e?.message);
    return null;
  }
}

export async function geocodificar(a) {
  const tentativas = [textoBusca(a)];

  const cep = await viaCep(a.zipCode);
  if (cep?.logradouro) {
    tentativas.push(
      [cep.logradouro, a.number, cep.bairro, cep.localidade, cep.uf, "Brasil"]
        .filter(Boolean)
        .join(", ")
    );
    tentativas.push(
      [cep.logradouro, cep.bairro, cep.localidade, cep.uf, "Brasil"]
        .filter(Boolean)
        .join(", ")
    );
  }

  tentativas.push([a.street, a.city, a.state, "Brasil"].filter(Boolean).join(", "));
  tentativas.push([a.neighborhood, a.city, a.state, "Brasil"].filter(Boolean).join(", "));
  tentativas.push([a.city, a.state, "Brasil"].filter(Boolean).join(", "));

  for (const q of tentativas) {
    const n = await nominatim(q);
    if (n) {
      console.log("Geocode OK (nominatim):", q, n);
      return n;
    }
    // Nominatim pede no máximo ~1 pedido por segundo
    await new Promise((r) => setTimeout(r, 1100));
  }

  // último recurso: geocoder do aparelho
  try {
    const r = await Location.geocodeAsync(tentativas[0]);
    if (r.length) {
      console.log("Geocode OK (expo):", tentativas[0]);
      return { latitude: r[0].latitude, longitude: r[0].longitude };
    }
  } catch (e) {
    console.log("Erro geocodeAsync:", e?.message);
  }

  console.log("Geocode FALHOU para:", tentativas);
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

// Distância real por ruas (OSRM). Se falhar, usa linha reta x 1,3
async function distanciaRotaKm(destino) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);

    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${LOJA.longitude},${LOJA.latitude};${destino.longitude},${destino.latitude}` +
      `?overview=false`;

    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const json = await res.json();

    if (json?.routes?.length) {
      const km = json.routes[0].distance / 1000;
      console.log("Distância por rota (km):", km);
      return km;
    }
  } catch (e) {
    console.log("Erro OSRM:", e?.message);
  }
  const km = linhaReta(LOJA, destino) * 1.3;
  console.log("Distância estimada (km):", km);
  return km;
}

// ⚠️ agora é ASYNC: use com await
export async function calcularTaxa(destino) {
  const km = await distanciaRotaKm(destino);
  const cobrados = Math.max(0, km - KM_GRATIS);
  let taxa = Math.round(cobrados * VALOR_POR_KM * 2) / 2; // arredonda p/ 0,50
  if (cobrados > 0) taxa = Math.max(taxa, TAXA_MINIMA);
  return { km, taxa };
}