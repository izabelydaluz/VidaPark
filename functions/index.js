const admin = require("firebase-admin");
const axios = require("axios");
const crypto = require("crypto");
const functions = require("firebase-functions");

admin.initializeApp();

const MP_ACCESS_TOKEN = "APP_USR-2685799172565187-062015-bb2b69faeb763eea5c94b1d44735cdba-1719917452";
const MP_API = "https://api.mercadopago.com/v1";
const WEBHOOK_URL = "https://us-central1-bella-plus-mulherao.cloudfunctions.net/mercadopagoWebhook";

function loadWebhookSecret() {
  try {
    const cfg = functions.config();
    if (cfg.mercadopago?.webhook_secret) return cfg.mercadopago.webhook_secret;
  } catch {}
  return process.env.MP_WEBHOOK_SECRET || "";
}

const MP_WEBHOOK_SECRET = loadWebhookSecret();

function authHeaders() {
  return { Authorization: `Bearer ${MP_ACCESS_TOKEN}`, "Content-Type": "application/json" };
}

function buildPayerInfo(pi) {
  const p = (pi.name || "").split(" ");
  return {
    email: pi.email,
    first_name: p[0] || "Cliente",
    last_name: p.slice(1).join(" ") || p[0] || "Cliente",
    identification: { type: "CPF", number: pi.cpf ? pi.cpf.replace(/\D/g, "") : "00000000000" },
  };
}

function getExpirationDate(method) {
  const n = new Date();
  if (method === "pix") return new Date(n.getTime() + 86400000).toISOString();
  if (method === "boleto") return new Date(n.getTime() + 259200000).toISOString();
  return null;
}

function ok(res, data) {
  res.set("Access-Control-Allow-Origin", "*");
  res.status(200).json(data);
}

function fail(res, code, msg) {
  res.set("Access-Control-Allow-Origin", "*");
  res.status(200).json({ error: { status: code, message: msg } });
}

async function getBody(req) {
  if (req.body && typeof req.body === "object" && Object.keys(req.body).length > 0) {
    return req.body;
  }
  try {
    if (typeof req.body === "string") return JSON.parse(req.body);
  } catch {}
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => raw += c);
    req.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve({}); } });
  });
}

exports.createPayment = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { paymentMethod, amount, description, payerInfo, cardInfo, installments, deviceFingerprint } = data;

  if (!amount || !paymentMethod || !payerInfo?.email) {
    return fail(res, "INVALID_ARGUMENT", "Dados incompletos");
  }

  const txAmount = Math.round(Number(amount) * 100) / 100;
  const isCard = paymentMethod === "card" || paymentMethod === "debit_card";
  const minAmount = isCard ? 0.50 : 0.01;
  if (!txAmount || txAmount < minAmount) {
    return fail(res, "INVALID_ARGUMENT", `Valor mínimo ${isCard ? "para cartão é R$ 0,50" : "é R$ 0,01"}. Valor enviado: R$ ${txAmount.toFixed(2)}`);
  }

  try {
    const body = {
      transaction_amount: txAmount,
      description: description || "Compra Bella Plus",
      payer: buildPayerInfo(payerInfo),
      notification_url: WEBHOOK_URL,
    };
    if (isCard && !cardInfo?.isDebit) {
      body.statement_descriptor = "BELLA PLUS";
    }
    if (deviceFingerprint) body.device_fingerprint = { id: deviceFingerprint };
    if (isCard) {
      const pn = (payerInfo.phone || "").replace(/\D/g, "");
      const area = pn.length > 2 ? pn.slice(0, 2) : "";
      const num = pn.length > 2 ? pn.slice(2) : pn;
      const pNames = (payerInfo.name || "").split(" ");
      const addPayer = { registration_date: new Date().toISOString() };
      addPayer.first_name = pNames[0] || "Cliente";
      addPayer.last_name = pNames.slice(1).join(" ") || pNames[0] || "Cliente";
      if (area && num) addPayer.phone = { area_code: area, number: num };
      if (payerInfo.address || payerInfo.zipCode) {
        addPayer.address = {};
        if (payerInfo.address) addPayer.address.street_name = payerInfo.address;
        if (payerInfo.zipCode) addPayer.address.zip_code = payerInfo.zipCode;
      }
      body.additional_info = {
        items: [{ id: "1", title: description || "Compra Bella Plus", quantity: 1, unit_price: txAmount }],
        payer: addPayer,
      };
    }

    if (paymentMethod === "pix") body.payment_method_id = "pix";
    else if (paymentMethod === "boleto") body.payment_method_id = "bolbradesco";
    else if (paymentMethod === "card" || paymentMethod === "debit_card") {
      if (!cardInfo?.token) return fail(res, "INVALID_ARGUMENT", "Dados do cartão incompletos");
      if (!cardInfo?.paymentMethodId) return fail(res, "INVALID_ARGUMENT", "Bandeira do cartão não detectada");
      body.payment_method_id = cardInfo.paymentMethodId;
      body.token = cardInfo.token;
      if (!cardInfo.isDebit) {
        body.installments = Math.max(1, Number(installments) || 1);
      }
    }
    console.log("Complete payment body:", JSON.stringify(body, (k, v) => k === "token" ? "***" : v, 2));

    const r = await axios.post(`${MP_API}/payments`, body, {
      headers: { ...authHeaders(), "X-Idempotency-Key": `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
    });

    const p = r.data;

    await admin.firestore().collection("payments").add({
      mpId: p.id, status: p.status, statusDetail: p.status_detail,
      amount: Number(amount), description: description || "Compra Bella Plus",
      paymentMethod, payer: payerInfo, paymentResponse: p,
      address: payerInfo.address || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    ok(res, {
      success: true,
      payment: {
        id: p.id, status: p.status, statusDetail: p.status_detail,
        transactionAmount: p.transaction_amount, dateOfExpiration: p.date_of_expiration,
        ...(paymentMethod === "pix" && {
          qrCode: p.point_of_interaction?.transaction_data?.qr_code,
          qrCodeBase64: p.point_of_interaction?.transaction_data?.qr_code_base64,
          ticketUrl: p.point_of_interaction?.transaction_data?.ticket_url,
        }),
        ...(paymentMethod === "boleto" && {
          boletoUrl: p.transaction_details?.external_resource_url,
          barcode: p.barcode?.content, dueDate: p.date_of_expiration,
        }),
        ...((paymentMethod === "card" || paymentMethod === "debit_card") && {
          paymentMethodId: p.payment_method_id, installments: p.installments,
          statementDescriptor: p.statement_descriptor,
        }),
      },
    });
  } catch (e) {
    const mpErr = e.response?.data;
    const reqData = e.config?.data;
    const statusCode = e.response?.status;
    console.error("MP payment error:", JSON.stringify({ status: statusCode, data: mpErr, requestBody: reqData }, null, 2));
    const causes = mpErr?.cause || [];
    const causeStr = causes.map((c) => `código ${c.code || "?"} ${c.description || ""}`).join(" | ");
    const full = JSON.stringify(mpErr);
    const firstCause = causes[0] || {};
    fail(res, "INTERNAL", `Erro MP (${statusCode}): ${causeStr || `código ${firstCause.code} ${firstCause.description}` || mpErr?.message || "Erro desconhecido"}`);
  }
});

exports.getPaymentStatus = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { paymentId } = data;
  if (!paymentId) return fail(res, "INVALID_ARGUMENT", "paymentId é obrigatório");
  try {
    const r = await axios.get(`${MP_API}/payments/${paymentId}`, { headers: authHeaders() });
    ok(res, {
      success: true,
      payment: {
        id: r.data.id, status: r.data.status, statusDetail: r.data.status_detail,
        dateOfExpiration: r.data.date_of_expiration, moneyReleaseDate: r.data.money_release_date,
      },
    });
  } catch (e) {
    console.error("Status error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao consultar status");
  }
});

exports.createCardToken = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { cardNumber, expirationMonth, expirationYear, securityCode, cardholderName, cpf } = data;
  if (!cardNumber || !expirationMonth || !expirationYear || !securityCode) {
    return fail(res, "INVALID_ARGUMENT", "Dados do cartão incompletos");
  }
  try {
    const r = await axios.post(`${MP_API}/card_tokens`, {
      card_number: cardNumber.replace(/\s/g, ""),
      expiration_month: Number(expirationMonth),
      expiration_year: Number(expirationYear) > 100 ? Number(expirationYear) : 2000 + Number(expirationYear),
      security_code: securityCode,
      cardholder: { name: cardholderName || "Cliente", identification: { type: "CPF", number: cpf ? cpf.replace(/\D/g, "") : "00000000000" } },
    }, { headers: authHeaders() });
    console.log("Card token FULL response:", JSON.stringify(r.data));
    if (!r.data?.id) return fail(res, "INTERNAL", "Falha ao criar token do cartão");
    const brandCode = r.data.bin_attributes?.brand?.code || "";
    const cardTypes = r.data.bin_attributes?.card_type || [];
    const isDebit = cardTypes.includes("debit-card");
    const brandToPmId = { mastercard: "master", visa: "visa", amex: "amex", elo: "elo", hipercard: "hipercard", discover: "discover", aura: "aura", jcb: "jcb", diners: "diners" };
    const pmId = brandToPmId[brandCode.toLowerCase()] || brandCode;
    if (!pmId) {
      fail(res, "INTERNAL", `Bandeira não reconhecida: ${brandCode}. Resposta: ${JSON.stringify(r.data)}`);
      return;
    }
    ok(res, { success: true, token: r.data.id, paymentMethodId: pmId, isDebit });
  } catch (e) {
    const mpErr = e.response?.data;
    const statusCode = e.response?.status;
    console.error("Card token error:", JSON.stringify(mpErr, null, 2));
    fail(res, "INTERNAL", `Token erro (${statusCode}): ${mpErr?.cause?.[0]?.description || mpErr?.message || "Erro ao validar cartão"}`);
  }
});

exports.mercadopagoWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method === "GET") return res.status(200).send("Webhook ativo");
  try {
    const xSig = req.headers["x-signature"] || "";
    if (MP_WEBHOOK_SECRET && xSig) {
      const valid = verifyWebhookSignature(xSig, req.body);
      if (!valid) {
        console.error("Webhook signature verification failed");
        return res.status(401).send("Invalid signature");
      }
    }
    const { action, data } = req.body;
    if ((action === "payment.created" || action === "payment.updated") && data?.id) {
      const r = await axios.get(`${MP_API}/payments/${data.id}`, { headers: authHeaders() });
      const p = r.data;
      const existing = await admin.firestore().collection("payments").where("mpId", "==", p.id).limit(1).get();
      if (!existing.empty) {
        await existing.docs[0].ref.update({ status: p.status, statusDetail: p.status_detail, mpId: p.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`Payment ${p.id} updated to ${p.status}`);
      } else if (p.external_reference) {
        const byRef = await admin.firestore().collection("payments").where("externalReference", "==", p.external_reference).limit(1).get();
        if (!byRef.empty) {
          await byRef.docs[0].ref.update({ status: p.status, statusDetail: p.status_detail, mpId: p.id, paymentMethod: p.payment_method_id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
          console.log(`Payment ${p.id} updated by external_reference ${p.external_reference} to ${p.status}`);
        } else {
          await admin.firestore().collection("payments").add({
            mpId: p.id, externalReference: p.external_reference, status: p.status, statusDetail: p.status_detail,
            amount: p.transaction_amount, description: p.description || "",
            paymentMethod: p.payment_method_id,
            payer: { email: p.payer?.email, name: `${p.payer?.first_name || ""} ${p.payer?.last_name || ""}`.trim() },
            paymentResponse: p, createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Payment ${p.id} created via webhook`);
        }
      } else {
        await admin.firestore().collection("payments").add({
          mpId: p.id, status: p.status, statusDetail: p.status_detail,
          amount: p.transaction_amount, description: p.description || "",
          paymentMethod: p.payment_method_id,
          payer: { email: p.payer?.email, name: `${p.payer?.first_name || ""} ${p.payer?.last_name || ""}`.trim() },
          paymentResponse: p, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Payment ${p.id} created via webhook`);
      }
    }
    if (action === "payment.refunded" && data?.id) {
      const existing = await admin.firestore().collection("payments").where("mpId", "==", data.id).limit(1).get();
      if (!existing.empty) {
        const r = await axios.get(`${MP_API}/payments/${data.id}`, { headers: authHeaders() });
        await existing.docs[0].ref.update({ status: r.data.status, statusDetail: r.data.status_detail, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`Payment ${data.id} refunded`);
      }
    }
    res.status(200).send("OK");
  } catch (e) {
    console.error("Webhook error:", e);
    res.status(200).send("OK");
  }
});

function verifyWebhookSignature(xSig, body) {
  try {
    const pairs = xSig.split(",").reduce((a, p) => {
      const [k, v] = p.trim().split("=");
      if (k && v) a[k.trim()] = v.trim();
      return a;
    }, {});
    const ts = pairs["ts"], hash = pairs["v1"];
    if (!ts || !hash || !body?.data?.id) return false;
    const comp = crypto.createHmac("sha256", MP_WEBHOOK_SECRET).update(`${body.data.id}|${ts}|${MP_WEBHOOK_SECRET}`).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(comp), Buffer.from(hash));
  } catch { return false; }
}

exports.refundPayment = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { paymentId, amount } = data;
  if (!paymentId) return fail(res, "INVALID_ARGUMENT", "paymentId é obrigatório");
  try {
    const body = amount ? { amount: Number(amount) } : {};
    const r = await axios.post(`${MP_API}/payments/${paymentId}/refunds`, body, { headers: authHeaders() });
    const ref = r.data;
    const existing = await admin.firestore().collection("payments").where("mpId", "==", paymentId).limit(1).get();
    if (!existing.empty) {
      await existing.docs[0].ref.update({ status: "refunded", statusDetail: amount ? `partial_${amount}` : "refunded", updatedAt: admin.firestore.FieldValue.serverTimestamp(), refundData: ref });
    }
    ok(res, { success: true, refund: { id: ref.id, status: ref.status, amountRefunded: ref.amount_refunded, totalRefunded: ref.total_refunded_to_date } });
  } catch (e) {
    console.error("Refund error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao processar estorno");
  }
});

exports.getInstallments = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { paymentMethodId, amount, issuerId } = data;
  if (!paymentMethodId || !amount) return fail(res, "INVALID_ARGUMENT", "paymentMethodId e amount obrigatórios");
  try {
    const params = { payment_method_id: paymentMethodId, amount: Number(amount), locale: "pt-BR" };
    if (issuerId) params.issuer_id = issuerId;
    const r = await axios.get(`${MP_API}/payment_methods/installments`, { headers: authHeaders(), params });
    const opts = (r.data[0]?.payer_costs || []).map((o) => ({
      installments: o.installments, installmentAmount: o.installment_amount,
      totalAmount: o.total_amount, interestRate: o.interest_rate,
      hasInterest: o.installment_rate > 0,
      label: `${o.installments}x ${o.installment_rate > 0 ? "com juros" : "sem juros"} - ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(o.installment_amount)}`,
    }));
    ok(res, { success: true, installments: opts });
  } catch (e) {
    console.error("Installments error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao consultar parcelas");
  }
});

exports.createCustomer = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const d = await getBody(req);
  const { email, name, cpf, cardToken } = d;
  if (!email || !name || !cpf) return fail(res, "INVALID_ARGUMENT", "email, name e cpf obrigatórios");
  const p = name.split(" "), fn = p[0] || "Cliente", ln = p.slice(1).join(" ") || fn;
  try {
    const exist = await axios.get(`${MP_API}/customers/search`, { headers: authHeaders(), params: { email } });
    if (exist.data.results?.length > 0) {
      const c = exist.data.results[0];
      if (cardToken) {
        const cr = await axios.post(`${MP_API}/customers/${c.id}/cards`, { token: cardToken }, { headers: authHeaders() });
        return ok(res, { success: true, customer: { id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name, cards: [cr.data] }, isNew: false });
      }
      return ok(res, { success: true, customer: { id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name }, isNew: false });
    }
    const cr = await axios.post(`${MP_API}/customers`, { email, first_name: fn, last_name: ln, identification: { type: "CPF", number: cpf.replace(/\D/g, "") } }, { headers: authHeaders() });
    const c = cr.data;
    if (cardToken) {
      const crd = await axios.post(`${MP_API}/customers/${c.id}/cards`, { token: cardToken }, { headers: authHeaders() });
      return ok(res, { success: true, customer: { id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name, cards: [crd.data] }, isNew: true });
    }
    ok(res, { success: true, customer: { id: c.id, email: c.email, firstName: c.first_name, lastName: c.last_name }, isNew: true });
  } catch (e) {
    console.error("Customer error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao criar/gerenciar cliente");
  }
});

exports.listCustomerCards = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { customerId } = data;
  if (!customerId) return fail(res, "INVALID_ARGUMENT", "customerId é obrigatório");
  try {
    const r = await axios.get(`${MP_API}/customers/${customerId}/cards`, { headers: authHeaders() });
    ok(res, {
      success: true,
      cards: r.data.map((c) => ({
        id: c.id, firstSixDigits: c.first_six_digits, lastFourDigits: c.last_four_digits,
        expirationMonth: c.expiration_month, expirationYear: c.expiration_year,
        paymentMethodId: c.payment_method?.id, cardholderName: c.cardholder?.name,
      })),
    });
  } catch (e) {
    console.error("List cards error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao listar cartões");
  }
});

exports.createPreference = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { amount, description, payerInfo, address } = data;
  if (!amount || !payerInfo?.email) return fail(res, "INVALID_ARGUMENT", "Dados incompletos");
  const txAmount = Math.round(Number(amount) * 100) / 100;
  const extRef = `order_${Date.now()}`;
  try {
    const r = await axios.post("https://api.mercadopago.com/checkout/preferences", {
      items: [{ title: description || "Compra Bella Plus", quantity: 1, currency_id: "BRL", unit_price: txAmount }],
      payer: { name: payerInfo.name || "Cliente", email: payerInfo.email },
      back_urls: { success: "https://bella-plus-mulherao.web.app/checkout-result.html?r=success", failure: "https://bella-plus-mulherao.web.app/checkout-result.html?r=failure", pending: "https://bella-plus-mulherao.web.app/checkout-result.html?r=pending" },
      auto_return: "approved",
      notification_url: WEBHOOK_URL,
      binary_mode: true,
      external_reference: extRef,
    }, { headers: authHeaders() });

    await admin.firestore().collection("payments").add({
      externalReference: extRef,
      preferenceId: r.data.id,
      status: "pending",
      statusDetail: "Aguardando pagamento",
      amount: txAmount,
      description: description || "Compra Bella Plus",
      paymentMethod: "checkout",
      payer: payerInfo,
      address: address || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    ok(res, { success: true, preferenceId: r.data.id, initPoint: r.data.init_point, externalReference: extRef });
  } catch (e) {
    console.error("Preference error:", e.response?.data || e.message);
    fail(res, "INTERNAL", "Erro ao criar preferência");
  }
});

exports.verifyPaymentByRef = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") return res.status(204).send("");
  const data = await getBody(req);
  const { externalReference } = data;
  if (!externalReference) return fail(res, "INVALID_ARGUMENT", "externalReference obrigatório");
  try {
    const snap = await admin.firestore().collection("payments")
      .where("externalReference", "==", externalReference)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      const p = doc.data();
      if (p.status === "approved") {
        return ok(res, { success: true, found: true, status: "approved", statusDetail: p.statusDetail, amount: p.amount, mpId: p.mpId || null });
      }
      if (p.mpId) {
        try {
          const r = await axios.get(`${MP_API}/payments/${p.mpId}`, { headers: authHeaders() });
          if (r.data.status === "approved" || r.data.status !== p.status) {
            await doc.ref.update({ status: r.data.status, statusDetail: r.data.status_detail, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
            return ok(res, { success: true, found: true, status: r.data.status, statusDetail: r.data.status_detail, amount: r.data.transaction_amount, mpId: r.data.id });
          }
        } catch (mpErr) { console.log("MP direct check error:", mpErr.message); }
      }
      return ok(res, { success: true, found: true, status: p.status, statusDetail: p.statusDetail, amount: p.amount, mpId: p.mpId || null });
    }

    try {
      const searchUrl = `${MP_API}/payments/search?external_reference=${externalReference}`;
      const r = await axios.get(searchUrl, { headers: authHeaders() });
      const results = r.data?.results || [];
      if (results.length > 0) {
        const mp = results[0];
        const existing = await admin.firestore().collection("payments").where("externalReference", "==", externalReference).limit(1).get();
        if (!existing.empty) {
          await existing.docs[0].ref.update({ status: mp.status, statusDetail: mp.status_detail, mpId: mp.id, paymentMethod: mp.payment_method_id, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        } else {
          await admin.firestore().collection("payments").add({
            mpId: mp.id, externalReference, status: mp.status, statusDetail: mp.status_detail,
            amount: mp.transaction_amount, description: mp.description || "",
            paymentMethod: mp.payment_method_id,
            payer: { email: mp.payer?.email, name: `${mp.payer?.first_name || ""} ${mp.payer?.last_name || ""}`.trim() },
            paymentResponse: mp, createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
        return ok(res, { success: true, found: true, status: mp.status, statusDetail: mp.status_detail, amount: mp.transaction_amount, mpId: mp.id });
      }
    } catch (mpErr) { console.log("MP search error:", mpErr.message); }

    return ok(res, { success: true, found: false, status: "pending" });
  } catch (e) {
    console.error("Verify error:", e);
    fail(res, "INTERNAL", "Erro ao verificar pagamento");
  }
});
