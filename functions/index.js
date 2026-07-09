// Waitless Cloud Functions — server-side queue logic so the browser can't tamper.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");

const PARK_EXPIRE_MIN = 10; // parked customers who never return are auto no-showed after this

admin.initializeApp();
const db = admin.firestore();
const opts = { region: "asia-south1", maxInstances: 10 };

// Brand every push so it looks legitimate (and less like "possible spam") on the
// lock screen. Icons must be absolute URLs; they live in the web app's /public.
const ICON = "https://waitless-io.vercel.app/icon-192.png";
const BADGE = "https://waitless-io.vercel.app/badge-96.png";
const webpush = { notification: { icon: ICON, badge: BADGE } };

// Customer takes a token. Server controls the number atomically.
exports.issueToken = onCall(opts, async (req) => {
  const { businessId, serviceId, name, phone, priority } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
  // Subscription enforcement: a suspended business can't take new tokens.
  const bizSnap = await db.doc(`businesses/${businessId}`).get();
  if (bizSnap.exists && bizSnap.data().status === "suspended")
    throw new HttpsError("failed-precondition", "This business has paused its queue.");
  const serviceRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const tokenRef = db.collection("tokens").doc();
  let out = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(serviceRef);
    if (!snap.exists) throw new HttpsError("not-found", "Service not found.");
    const s = snap.data();
    const next = (s.lastIssued || 0) + 1;
    const number = `${s.prefix}-${next}`;
    tx.update(serviceRef, { lastIssued: next });
    tx.set(tokenRef, {
      businessId, serviceId, prefix: s.prefix, numericValue: next, number,
      customerName: name || "Guest", phone: phone || "", priority: priority || "regular",
      status: "waiting", createdAt: FieldValue.serverTimestamp(),
    });
    out = { id: tokenRef.id, number, numericValue: next };
  });
  return out;
});

// Staff advances the queue. Requires auth (staff/admin signed in).
exports.advanceQueue = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, serviceId, servedBy } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
  const qs = await db.collection("tokens")
    .where("businessId", "==", businessId)
    .where("serviceId", "==", serviceId)
    .where("status", "==", "waiting")
    .orderBy("numericValue").limit(1).get();
  if (qs.empty) return { num: null };
  const d = qs.docs[0];
  const num = d.data().numericValue;

  // Honest ETA: measure the real gap since the previous "call next" and keep a
  // rolling window of the last 10. Gaps under 30s (demo-clicking) or over 90min
  // (lunch break / closed) would poison the average, so they're skipped.
  const svcRef = db.doc(`businesses/${businessId}/services/${serviceId}`);
  const svcSnap = await svcRef.get();
  const s = svcSnap.exists ? svcSnap.data() : {};
  const nowMs = Date.now();
  let gaps = Array.isArray(s.recentGaps) ? s.recentGaps.slice() : [];
  if (s.lastAdvanceAt && typeof s.lastAdvanceAt.toMillis === "function") {
    const gap = (nowMs - s.lastAdvanceAt.toMillis()) / 60000;
    if (gap >= 0.5 && gap <= 90) gaps = [...gaps, Math.round(gap * 10) / 10].slice(-10);
  }
  const pace = gaps.length >= 3
    ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10
    : null;

  const prevServing = s.currentServing || 0;
  const batch = db.batch();
  batch.update(d.ref, { status: "served", servedBy: servedBy || null, completedAt: FieldValue.serverTimestamp() });
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
  await notifyQueue(businessId, serviceId, num, prevServing);
  return { num };
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
    if (!t.fcmToken) continue;
    try {
      await admin.messaging().send({ token: t.fcmToken, notification: alertMessage(stage, t.number, away, spedUp, svcName), webpush });
    } catch (e) { /* stale token, ignore */ }
  }
}

// Staff sends the customer being served into another service's queue.
// The SAME token doc moves stages, so the customer's live token page follows along.
exports.transferToken = onCall(opts, async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Staff sign-in required.");
  const { businessId, fromServiceId, toServiceId } = req.data || {};
  if (!businessId || !fromServiceId || !toServiceId || fromServiceId === toServiceId)
    throw new HttpsError("invalid-argument", "Missing or invalid service ids.");

  const fromRef = db.doc(`businesses/${businessId}/services/${fromServiceId}`);
  const toRef = db.doc(`businesses/${businessId}/services/${toServiceId}`);
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
      journey: FieldValue.arrayUnion({
        serviceId: fromServiceId, serviceName: fromSnap.data().name || "",
        number: t.number, servedBy: t.servedBy || null, at: Date.now(),
      }),
    });
    out = { id: tokRef.id, number, numericValue: next, position: Math.max(1, next - (s.currentServing || 0)), toName: s.name || "" };
  });

  // Tell the customer where to go next.
  const tokData = (await tokRef.get()).data();
  if (tokData.fcmToken) {
    try {
      await admin.messaging().send({
        token: tokData.fcmToken,
        notification: {
          title: `Next step: ${out.toName} ➡️`,
          body: `Your new token is ${out.number} — ${out.position <= 1 ? "you're next!" : `${out.position - 1} ahead of you.`}`,
        },
        webpush,
      });
    } catch (e) { /* stale token, ignore */ }
  }
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
  for (const d of qs.docs) {
    const t = d.data();
    if (!t.fcmToken) continue;
    const ahead = Math.max(0, t.numericValue - (s.currentServing || 0) - 1);
    const eta = Math.round(ahead * paceMins + delayMins);
    try {
      await admin.messaging().send({
        token: t.fcmToken,
        notification: {
          title,
          body: delayMins > 0
            ? `${s.name}: token ${t.number} is now estimated in ~${eta} min. Sorry for the wait!`
            : `${s.name}: the delay is over — token ${t.number} is estimated in ~${eta} min.`,
        },
        webpush,
      });
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

