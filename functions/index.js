// Waitless Cloud Functions — server-side queue logic so the browser can't tamper.
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const PARK_EXPIRE_MIN = 10; // parked customers who never return are auto no-showed after this
const FREE_MONTHLY_TOKENS = 1000; // free-plan cap; trial/pro/enterprise are unlimited
const TRIAL_DAYS = 30;

// WhatsApp (Meta Cloud API, direct — no middleman). All empty until Imran creates
// the Meta account; every WhatsApp path silently no-ops while unconfigured.
const WA_TOKEN = defineString("WA_TOKEN", { default: "" });
const WA_PHONE_ID = defineString("WA_PHONE_ID", { default: "" });
const WA_VERIFY_TOKEN = defineString("WA_VERIFY_TOKEN", { default: "waitless-verify" });
const WA_TEMPLATE = defineString("WA_TEMPLATE", { default: "" }); // approved utility template for out-of-window sends

admin.initializeApp();
const db = admin.firestore();
const opts = { region: "asia-south1", maxInstances: 10 };

// Brand every push so it looks legitimate (and less like "possible spam") on the
// lock screen. Icons must be absolute URLs; they live in the web app's /public.
const ICON = "https://waitlessqueue.com/icon-192.png";
const BADGE = "https://waitlessqueue.com/badge-96.png";
const webpush = { notification: { icon: ICON, badge: BADGE } };

const monthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

/** Plan the business is effectively on right now — an expired trial counts as free. */
function effectivePlan(b) {
  if (!b) return "free";
  if (b.status === "trial") {
    const ends = b.trialEndsAt && typeof b.trialEndsAt.toMillis === "function" ? b.trialEndsAt.toMillis() : 0;
    return ends > Date.now() ? "pro" : "free";
  }
  return b.plan || "free";
}

/**
 * WhatsApp alert for one token. Free-form text while the customer's 24h window
 * is open (₹0 — they messaged us first); outside it, falls back to the approved
 * paid utility template and counts the send for pass-through billing.
 */
async function waSend(biz, tok, text) {
  try {
    if (!biz || biz.waEnabled !== true || !tok || !tok.waTo) return;
    const token = WA_TOKEN.value(), phoneId = WA_PHONE_ID.value();
    if (!token || !phoneId) return;
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const openedAt = tok.waWindowAt && typeof tok.waWindowAt.toMillis === "function" ? tok.waWindowAt.toMillis() : 0;
    const inWindow = Date.now() - openedAt < 24 * 3600 * 1000;
    const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    if (inWindow) {
      await fetch(url, { method: "POST", headers, body: JSON.stringify({
        messaging_product: "whatsapp", to: tok.waTo, type: "text", text: { body: text },
      }) });
    } else if (WA_TEMPLATE.value()) {
      await fetch(url, { method: "POST", headers, body: JSON.stringify({
        messaging_product: "whatsapp", to: tok.waTo, type: "template",
        template: { name: WA_TEMPLATE.value(), language: { code: "en" },
          components: [{ type: "body", parameters: [{ type: "text", text }] }] },
      }) });
      // Paid send — count it against the business for pass-through billing.
      const key = monthKey();
      const ref = db.doc(`businesses/${tok.businessId}`);
      if (biz.waPaidMonthKey === key) await ref.update({ waPaidCount: FieldValue.increment(1) });
      else await ref.update({ waPaidCount: 1, waPaidMonthKey: key });
    }
  } catch (e) { console.error("waSend failed:", e.message); }
}

// Customer takes a token. Server controls the number atomically, enforces the
// business's plan (suspension, free-plan monthly cap) and counts monthly usage.
exports.issueToken = onCall(opts, async (req) => {
  const { businessId, serviceId, name, phone, priority } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
  const bizRef = db.doc(`businesses/${businessId}`);
  const serviceRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const tokenRef = db.collection("tokens").doc();
  let out = null;
  await db.runTransaction(async (tx) => {
    const [bizSnap, snap] = await Promise.all([tx.get(bizRef), tx.get(serviceRef)]);
    if (!snap.exists) throw new HttpsError("not-found", "Service not found.");
    const b = bizSnap.exists ? bizSnap.data() : {};
    if (b.status === "suspended")
      throw new HttpsError("failed-precondition", "This business has paused its queue.");

    // Monthly usage counter (lazy reset when the month changes). Free plan is
    // capped; trial/pro/enterprise are unlimited but still counted for display.
    const key = monthKey();
    const used = b.tokensMonthKey === key ? (b.monthlyTokens || 0) : 0;
    if (effectivePlan(b) === "free" && used >= FREE_MONTHLY_TOKENS)
      throw new HttpsError("resource-exhausted",
        "This business has reached its free monthly token limit. Please ask at the counter.");

    const s = snap.data();
    const next = (s.lastIssued || 0) + 1;
    const number = `${s.prefix}-${next}`;
    tx.update(serviceRef, { lastIssued: next });
    tx.update(bizRef, { monthlyTokens: used + 1, tokensMonthKey: key });
    tx.set(tokenRef, {
      businessId, serviceId, prefix: s.prefix, numericValue: next, number,
      customerName: name || "Guest", phone: phone || "", priority: priority || "regular",
      status: "waiting", createdAt: FieldValue.serverTimestamp(),
      // Short code the customer texts us on WhatsApp to link their number.
      waCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
    });
    out = { id: tokenRef.id, number, numericValue: next };
  });
  return out;
});

async function _advanceQueueLogic(businessId, serviceId, servedBy, action) {
  const svcRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const svcSnap = await svcRef.get();
  const s = svcSnap.exists ? svcSnap.data() : {};
  const prevServing = s.currentServing || 0;
  
  const batch = db.batch();

  // 1. Process the previously serving token based on the action
  if (prevServing > 0) {
    const prevQs = await db.collection("tokens")
      .where("businessId", "==", businessId)
      .where("serviceId", "==", serviceId)
      .where("numericValue", "==", prevServing)
      .limit(1).get();
      
    if (!prevQs.empty) {
      let finalStatus = "served";
      if (action === "noshow") finalStatus = "no-show";
      else if (action === "transferred") finalStatus = null; // Do not touch!
      // If it's just "next", we assume the previous was "served".
      
      if (finalStatus) {
        batch.update(prevQs.docs[0].ref, {
          status: finalStatus,
          completedAt: FieldValue.serverTimestamp()
        });
      }
    }
  }

  // 2. Find the next token
  const qs = await db.collection("tokens")
    .where("businessId", "==", businessId)
    .where("serviceId", "==", serviceId)
    .where("status", "==", "waiting")
    .orderBy("numericValue").limit(1).get();

  // If nobody is waiting, just clear the current serving and commit.
  if (qs.empty) {
    batch.update(svcRef, { currentServing: 0 });
    await batch.commit();
    return { num: null };
  }

  const d = qs.docs[0];
  const num = d.data().numericValue;

  // Honest ETA: measure the real gap since the previous "call next"
  const nowMs = Date.now();
  let gaps = Array.isArray(s.recentGaps) ? s.recentGaps.slice() : [];
  if (s.lastAdvanceAt && typeof s.lastAdvanceAt.toMillis === "function") {
    const gap = (nowMs - s.lastAdvanceAt.toMillis()) / 60000;
    if (gap >= 0.5 && gap <= 90) gaps = [...gaps, Math.round(gap * 10) / 10].slice(-10);
  }
  const pace = gaps.length >= 3
    ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10
    : null;

  batch.update(d.ref, { status: "served", servedBy: servedBy || null });
  batch.update(svcRef, {
    currentServing: num,
    lastAdvanceAt: Timestamp.fromMillis(nowMs),
    recentGaps: gaps,
    ...(pace != null ? { paceMins: pace } : {}),
  });
  await batch.commit();

  // "It's your turn" goes to the person just called.
  const served = d.data();
  if (served.fcmToken) {
    try {
      await admin.messaging().send({
        token: served.fcmToken,
        notification: { title: "It's your turn! 🎉", body: `${served.number} — please proceed to the counter.` },
        webpush,
      });
    } catch (e) { /* stale token, ignore */ }
  }
  const bizData = (await db.doc(`businesses/${businessId}`).get()).data();
  await waSend(bizData, served, `🎉 It's your turn! ${served.number} — please proceed to the counter.`);
  await notifyQueue(businessId, serviceId, num, prevServing);
  return { num };
}

// Staff advances the queue. Requires auth (staff/admin signed in).
exports.advanceQueue = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, serviceId, servedBy, action } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
  
  return await _advanceQueueLogic(businessId, serviceId, servedBy, action);
});

/** The three position-based alert stages a waiting customer passes through. */
function alertMessage(stage, number, away, spedUp, svcName) {
  const who = svcName ? `${svcName}: ${number}` : number;
  if (stage === 2) {
    return spedUp
      ? { title: "Queue moving fast — come now ⚡", body: `${who} — the queue sped up, you're ${away} away. Please come to the counter now.` }
      : { title: "You're almost up ⏰", body: `${who} — you're ${away} away. Please head to the counter.` };
  }
  return { title: "Get ready 🔔", body: `${who} — ${away} people ahead. Time to start heading over.` };
}

/**
 * Position-based alerts to everyone still waiting. Each token remembers the
 * highest stage it has been alerted at (alertStage), so it's told once per stage
 * and jumps (no-shows) are handled — if the queue leaps past a threshold we send
 * the most relevant alert and flag that it "sped up".
 */
async function notifyQueue(businessId, serviceId, C, prevC) {
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  const b = bizSnap.exists ? bizSnap.data() : {};
  const headsUp = Number.isFinite(b.alertHeadsUp) ? b.alertHeadsUp : 10;
  const comeNow = Number.isFinite(b.alertComeNow) ? b.alertComeNow : 3;
  const svcSnap = await db.doc(`businesses/${businessId}/services/${serviceId}`).get();
  const svcName = svcSnap.exists ? (svcSnap.data().name || "") : "";
  const spedUp = (C - (prevC || 0)) > 1;

  const waiting = await db.collection("tokens")
    .where("businessId", "==", businessId)
    .where("serviceId", "==", serviceId)
    .where("status", "==", "waiting")
    .get();

  for (const d of waiting.docs) {
    const t = d.data();
    const away = t.numericValue - C;
    let stage = 0;
    if (away > 0 && away <= comeNow) stage = 2;
    else if (away > comeNow && away <= headsUp) stage = 1;
    if (stage === 0 || stage <= (t.alertStage || 0)) continue;
    await d.ref.update({ alertStage: stage });
    const msg = alertMessage(stage, t.number, away, spedUp, svcName);
    await waSend(b, t, `${msg.title}\n${msg.body}`);
    if (!t.fcmToken) continue;
    try {
      await admin.messaging().send({ token: t.fcmToken, notification: msg, webpush });
    } catch (e) { /* stale token, ignore */ }
  }
}

// Staff sends the customer being served into another service's queue.
// The SAME token doc moves stages, so the customer's live token page follows along.
exports.transferToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, fromServiceId, toServiceId, room } = req.data || {};
  if (!businessId || !fromServiceId)
    throw new HttpsError("invalid-argument", "Missing or invalid service ids.");
  if (toServiceId && fromServiceId === toServiceId)
    throw new HttpsError("invalid-argument", "Cannot transfer to same service.");
  if (!toServiceId && !room)
    throw new HttpsError("invalid-argument", "Must specify either a destination service or a room.");

  const fromRef = db.doc(`businesses/${businessId}/services/${fromServiceId}`);
  const fromSnap = await fromRef.get();
  if (!fromSnap.exists) throw new HttpsError("not-found", "Service not found.");
  const cur = fromSnap.data().currentServing || 0;
  if (!cur) throw new HttpsError("failed-precondition", "No customer is being served yet.");

  // The customer at the counter = the token holding the number currently being served.
  const qs = await db.collection("tokens")
    .where("businessId", "==", businessId)
    .where("serviceId", "==", fromServiceId)
    .where("numericValue", "==", cur)
    .limit(1).get();
  if (qs.empty) throw new HttpsError("not-found", "Current customer's token not found.");
  const tokRef = qs.docs[0].ref;

  if (!toServiceId && room) {
    await tokRef.update({
      room,
      status: "transferred", // Was 'served', but now needs to wait for Doctor
      transferredAt: FieldValue.serverTimestamp(),
      transferredBy: req.auth.uid
    });
    const served = (await tokRef.get()).data();
    if (served.fcmToken) {
      try {
        await admin.messaging().send({
          token: served.fcmToken,
          notification: { title: "Please proceed", body: `${served.number} — please proceed to ${room}.` },
          webpush,
        });
      } catch (e) { /* ignore */ }
    }
    const bizData = (await db.doc(`businesses/${businessId}`).get()).data();
    await waSend(bizData, served, `🏥 ${served.number} — please proceed to ${room}.`);
    
    // Auto-advance the queue so the client doesn't have to wait or flicker
    await _advanceQueueLogic(businessId, fromServiceId, req.auth.uid, "transferred");
    
    return { toName: room, number: served.number };
  }

  const toRef = db.doc(`businesses/${businessId}/services/${toServiceId}`);
  let out = null;
  await db.runTransaction(async (tx) => {
    const [toSnap, tokSnap] = await Promise.all([tx.get(toRef), tx.get(tokRef)]);
    if (!toSnap.exists) throw new HttpsError("not-found", "Target service not found.");
    const s = toSnap.data();
    const t = tokSnap.data();
    const next = (s.lastIssued || 0) + 1;
    const number = `${s.prefix}-${next}`;
    tx.update(toRef, { lastIssued: next });
    tx.update(tokRef, {
      serviceId: toServiceId, prefix: s.prefix, numericValue: next, number,
      status: "waiting", servedBy: null, alertStage: 0,
      room: room || FieldValue.delete(),
      journey: FieldValue.arrayUnion({
        serviceId: fromServiceId, serviceName: fromSnap.data().name || "",
        number: t.number, servedBy: t.servedBy || null, at: Date.now(),
      }),
    });
    out = { id: tokRef.id, number, numericValue: next, position: Math.max(1, next - (s.currentServing || 0)), toName: s.name || "", room: room || "" };
  });

  // Tell the customer where to go next.
  const tokData = (await tokRef.get()).data();
  if (tokData.fcmToken) {
    try {
      await admin.messaging().send({
        token: tokData.fcmToken,
        notification: {
          title: `Next step: ${out.toName} ➡️`,
          body: `Your new token is ${out.number} — ${out.position <= 1 ? "you're next!" : `${out.position - 1} ahead of you.`}${out.room ? ` Please proceed to ${out.room}.` : ""}`,
        },
        webpush,
      });
    } catch (e) { /* stale token, ignore */ }
  }
  const xferBiz = (await db.doc(`businesses/${businessId}`).get()).data();
  await waSend(xferBiz, tokData, `➡️ Next step: ${out.toName}. Your new token is ${out.number} — ${out.position <= 1 ? "you're next!" : `${out.position - 1} ahead of you.`}${out.room ? ` Please proceed to ${out.room}.` : ""}`);
  return out;
});

// Staff announces a delay (or clears it with 0). Saved on the service so every
// screen shows it, and everyone still waiting gets a push with their new ETA.
exports.setDelay = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, serviceId, delayMins } = req.data || {};
  if (!businessId || !serviceId || typeof delayMins !== "number" || delayMins < 0 || delayMins > 480)
    throw new HttpsError("invalid-argument", "Missing or invalid fields.");

  const ref = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Service not found.");
  const s = snap.data();
  await ref.update({ delayMins, delayAt: FieldValue.serverTimestamp() });

  const qs = await db.collection("tokens")
    .where("businessId", "==", businessId)
    .where("serviceId", "==", serviceId)
    .where("status", "==", "waiting")
    .get();
  let notified = 0;
  const title = delayMins > 0 ? `Running ~${delayMins} min behind ⏳` : "Back on schedule ✅";
  const paceMins = s.paceMins > 0 ? s.paceMins : (s.avgMins || 5);
  const delayBiz = (await db.doc(`businesses/${businessId}`).get()).data();
  for (const d of qs.docs) {
    const t = d.data();
    const ahead = Math.max(0, t.numericValue - (s.currentServing || 0) - 1);
    const eta = Math.round(ahead * paceMins + delayMins);
    const body = delayMins > 0
      ? `${s.name}: token ${t.number} is now estimated in ~${eta} min. Sorry for the wait!`
      : `${s.name}: the delay is over — token ${t.number} is estimated in ~${eta} min.`;
    await waSend(delayBiz, t, `${title}\n${body}`);
    if (!t.fcmToken) continue;
    try {
      await admin.messaging().send({ token: t.fcmToken, notification: { title, body }, webpush });
      notified++;
    } catch (e) { /* stale token, ignore */ }
  }
  return { ok: true, notified, waiting: qs.size };
});

// Staff parks the customer currently at the counter (called but hasn't shown up).
// Their slot is held — the counter keeps moving — until staff recalls them.
exports.parkToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, serviceId } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
  const svcSnap = await db.doc(`businesses/${businessId}/services/${serviceId}`).get();
  if (!svcSnap.exists) throw new HttpsError("not-found", "Service not found.");
  const C = svcSnap.data().currentServing || 0;
  if (!C) throw new HttpsError("failed-precondition", "No customer is being served yet.");

  const qs = await db.collection("tokens")
    .where("businessId", "==", businessId).where("serviceId", "==", serviceId)
    .where("numericValue", "==", C).where("status", "==", "served").limit(1).get();
  if (qs.empty) throw new HttpsError("not-found", "No customer at the counter to park.");
  const ref = qs.docs[0].ref;
  const t = qs.docs[0].data();
  await ref.update({ status: "parked", parkedAt: FieldValue.serverTimestamp() });

  if (t.fcmToken) {
    try {
      await admin.messaging().send({
        token: t.fcmToken,
        notification: { title: "We're holding your spot 🅿️", body: `${t.number} — you were called. Please come to the counter, we've kept your place.` },
        webpush,
      });
    } catch (e) { /* stale token, ignore */ }
  }
  const parkBiz = (await db.doc(`businesses/${businessId}`).get()).data();
  await waSend(parkBiz, t, `🅿️ We're holding your spot — ${t.number}. You were called; please come to the counter, we've kept your place.`);
  
  // After parking the current token, auto-advance the queue to the next person
  await _advanceQueueLogic(businessId, serviceId, null, "park");

  return { ok: true, number: t.number };
});

// Staff recalls a parked customer back to the counter (they've arrived).
exports.recallToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, serviceId, tokenId } = req.data || {};
  if (!businessId || !serviceId || !tokenId) throw new HttpsError("invalid-argument", "Missing fields.");
  const tokRef = db.doc(`tokens/${tokenId}`);
  const tokSnap = await tokRef.get();
  if (!tokSnap.exists) throw new HttpsError("not-found", "Token not found.");
  const t = tokSnap.data();
  if (t.status !== "parked") throw new HttpsError("failed-precondition", "That customer is not parked.");

  const batch = db.batch();
  batch.update(tokRef, { status: "served", parkedAt: FieldValue.delete() });
  batch.update(db.doc(`businesses/${businessId}/services/${serviceId}`), { currentServing: t.numericValue });
  await batch.commit();
  return { ok: true, number: t.number };
});

// Every few minutes, no-show any parked customer who never came back.
exports.expireParked = onSchedule({ schedule: "every 5 minutes", region: "asia-south1" }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - PARK_EXPIRE_MIN * 60000);
  const qs = await db.collection("tokens")
    .where("status", "==", "parked").where("parkedAt", "<=", cutoff).get();
  if (qs.empty) return;
  const batch = db.batch();
  qs.docs.forEach((d) => batch.update(d.ref, { status: "noshow", parkedAt: FieldValue.delete() }));
  await batch.commit();
  console.log(`expireParked: no-showed ${qs.size} stale parked token(s)`);
});

// Customer cancels their own token.
exports.cancelToken = onCall(opts, async (req) => {
  const { tokenId } = req.data || {};
  if (!tokenId) throw new HttpsError("invalid-argument", "Missing tokenId.");
  await db.doc(`tokens/${tokenId}`).update({ status: "cancelled" });
  return { ok: true };
});

// Customer registers their device's push token against their queue token.
exports.registerPush = onCall(opts, async (req) => {
  const { tokenId, fcmToken } = req.data || {};
  if (!tokenId || !fcmToken) throw new HttpsError("invalid-argument", "Missing tokenId/fcmToken.");
  await db.doc(`tokens/${tokenId}`).update({ fcmToken });
  return { ok: true };
});

// Admin updates a staff/doctor auth account (password/email)
exports.updateAuthAccount = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign-in required.");
  const { uid, email, password, displayName } = req.data || {};
  if (!uid) throw new HttpsError("invalid-argument", "Missing uid.");
  
  // Verify caller is admin of the same business
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can edit accounts.");
  }
  const callerBizId = callerSnap.data().businessId;
  const targetSnap = await db.doc(`users/${uid}`).get();
  if (!targetSnap.exists || targetSnap.data().businessId !== callerBizId) {
    throw new HttpsError("permission-denied", "Target user not found or not in your business.");
  }
  
  const updates = {};
  if (email && email.trim() !== "") updates.email = email.trim();
  if (password && password.trim() !== "") updates.password = password.trim();
  if (displayName && displayName.trim() !== "") updates.displayName = displayName.trim();
  
  if (Object.keys(updates).length > 0) {
    await admin.auth().updateUser(uid, updates);
  }
  
  return { ok: true };
});

exports.createAuthAccount = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign-in required.");
  
  const callerSnap = await db.doc(`users/${req.auth.uid}`).get();
  if (!callerSnap.exists || callerSnap.data().role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can create accounts.");
  }
  
  const { email, password, displayName, role } = req.data || {};
  if (!email || !password) throw new HttpsError("invalid-argument", "Missing email or password.");
  
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName
    });

    await db.doc(`users/${userRecord.uid}`).set({
      email,
      name: displayName,
      role: role || "staff",
      businessId: callerSnap.data().businessId
    });

    return { uid: userRecord.uid };
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Email already exists.');
    }
    throw new HttpsError("internal", err.message);
  }
});

const CATEGORY_ICON = { Hospitals: "🏥", Clinics: "💊", Banks: "🏦", Government: "🏛️", Restaurants: "🍽️" };

// A new business owner self-signs-up: they've just created their Firebase Auth
// account client-side (so req.auth is theirs, can't be spoofed), and this creates
// their business + links their account to it as its admin, atomically. Runs with
// admin privileges so it bypasses the `users` collection's client-write-blocked rule.
exports.onboardBusiness = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required.");
  const { businessName, category, country, location, ownerName } = req.data || {};
  if (!businessName || !String(businessName).trim()) throw new HttpsError("invalid-argument", "Business name is required.");

  const uid = req.auth.uid;
  const userRef = db.doc(`users/${uid}`);
  const existing = await userRef.get();
  if (existing.exists) throw new HttpsError("already-exists", "This account is already linked to a business.");

  const icon = CATEGORY_ICON[category] || "🏢";
  const bizRef = db.collection("businesses").doc();
  await bizRef.set({
    name: String(businessName).trim(), category: category || "Clinics", categoryIcon: icon, logo: icon,
    country: String(country || "US").trim(),
    location: String(location || "").trim(), distanceKm: 0, likes: 0, monthlyTokens: 0,
    plan: "pro", status: "trial",
    trialEndsAt: Timestamp.fromMillis(Date.now() + TRIAL_DAYS * 86400000),
  });
  await userRef.set({
    email: req.auth.token.email || "", role: "admin",
    name: String(ownerName || "").trim() || "Business Owner", businessId: bizRef.id,
  });
  return { businessId: bizRef.id };
});

// Once a day, drop expired trials down to the free plan.
exports.expireTrials = onSchedule({ schedule: "every 24 hours", region: "asia-south1" }, async () => {
  const qs = await db.collection("businesses")
    .where("status", "==", "trial")
    .where("trialEndsAt", "<=", Timestamp.now()).get();
  if (qs.empty) return;
  const batch = db.batch();
  qs.docs.forEach((d) => batch.update(d.ref, {
    plan: "free", status: "active", trialEndsAt: FieldValue.delete(), trialUsed: true,
  }));
  await batch.commit();
  console.log(`expireTrials: ${qs.size} trial(s) moved to free plan`);
});

/**
 * Meta WhatsApp webhook. GET = Meta's one-time verification handshake.
 * POST = inbound customer messages: "TRACK <code>" links their WhatsApp number
 * to that token and opens the free 24h reply window; any later message from a
 * linked number just refreshes the window.
 */
exports.whatsappWebhook = onRequest({ region: "asia-south1", maxInstances: 5 }, async (req, res) => {
  if (req.method === "GET") {
    if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === WA_VERIFY_TOKEN.value()) {
      res.status(200).send(req.query["hub.challenge"]);
    } else res.sendStatus(403);
    return;
  }
  if (req.method !== "POST") { res.sendStatus(405); return; }
  try {
    const msg = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!msg || msg.type !== "text") { res.sendStatus(200); return; }
    const from = msg.from; // customer's WhatsApp number (wa_id)
    const text = String(msg.text?.body || "");
    const m = text.match(/TRACK\s+([A-Z0-9]{6})/i);
    if (m) {
      const code = m[1].toUpperCase();
      const qs = await db.collection("tokens").where("waCode", "==", code).limit(1).get();
      if (!qs.empty) {
        const d = qs.docs[0];
        await d.ref.update({ waTo: from, waWindowAt: FieldValue.serverTimestamp() });
        const biz = (await db.doc(`businesses/${d.data().businessId}`).get()).data() || {};
        await waSend({ ...biz, waEnabled: true }, { ...d.data(), waTo: from, waWindowAt: Timestamp.now() },
          `✅ Linked! Token ${d.data().number} — we'll message you here as your turn nears.`);
      }
    } else {
      // Known customer said something else — refresh their free window.
      const qs = await db.collection("tokens").where("waTo", "==", from)
        .where("status", "in", ["waiting", "parked"]).limit(5).get();
      const batch = db.batch();
      qs.docs.forEach((d) => batch.update(d.ref, { waWindowAt: FieldValue.serverTimestamp() }));
      if (!qs.empty) await batch.commit();
    }
    res.sendStatus(200);
  } catch (e) {
    console.error("whatsappWebhook:", e.message);
    res.sendStatus(200); // always 200 so Meta doesn't retry-storm
  }
});

// Doctor calls a token that was transferred to their room.
exports.doctorCallToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Doctor sign-in required.");
  const { tokenId } = req.data || {};
  if (!tokenId) throw new HttpsError("invalid-argument", "Missing tokenId.");
  const tokRef = db.doc(`tokens/${tokenId}`);
  const snap = await tokRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Token not found.");
  
  await tokRef.update({
    status: "serving_doctor",
    doctorCalledAt: FieldValue.serverTimestamp(),
    servedByDoctor: req.auth.uid
  });
  
  return { ok: true };
});

// Doctor completes a token.
exports.doctorCompleteToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Doctor sign-in required.");
  const { tokenId } = req.data || {};
  if (!tokenId) throw new HttpsError("invalid-argument", "Missing tokenId.");
  const tokRef = db.doc(`tokens/${tokenId}`);
  
  await tokRef.update({
    status: "served",
    completedAt: FieldValue.serverTimestamp(),
  });
  
  return { ok: true };
});

