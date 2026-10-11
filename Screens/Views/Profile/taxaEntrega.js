async function nominatim(q) {
  try {
    const url =
      "https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=" +
      encodeURIComponent(q);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "VidaParkApp/1.0",
        "Accept-Language": "pt-BR",
      },
    });

    const json = await res.json();

    if (Array.isArray(json) && json.length) {
      return {
        latitude: parseFloat(json[0].lat),
        longitude: parseFloat(json[0].lon),
      };
    }
  } catch (e) {
    console.log("Erro Nominatim:", e);
  }
  return null;
}

export async function geocodificar(a) {
  const tentativas = [
    textoBusca(a),
    [a.street, a.city, a.state, "Brasil"].filter(Boolean).join(", "),
    a.zipCode ? `${a.zipCode}, Brasil` : null,
    [a.city, a.state, "Brasil"].filter(Boolean).join(", "),
  ].filter(Boolean);

  for (const q of tentativas) {
    try {
      const r = await Location.geocodeAsync(q);
      if (r.length) {
        console.log("Geocode OK (expo):", q);
        return { latitude: r[0].latitude, longitude: r[0].longitude };
      }
    } catch (e) {
      console.log("Erro geocodeAsync:", e);
    }

    const n = await nominatim(q);
    if (n) {
      console.log("Geocode OK (nominatim):", q);
      return n;
    }
  }

  console.log("Geocode falhou para:", tentativas);
  return null;
}