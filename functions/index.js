// Waitless Cloud Functions — server-side queue logic so the browser can't tamper.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const opts = { region: "asia-south1", maxInstances: 10 };

// Customer takes a token. Server controls the number atomically.
exports.issueToken = onCall(opts, async (req) => {
  const { businessId, serviceId, name, phone, priority } = req.data || {};
  if (!businessId || !serviceId) throw new HttpsError("invalid-argument", "Missing business/service.");
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
      status: "waiting", createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
  const batch = db.batch();
  batch.update(d.ref, { status: "served", servedBy: servedBy || null, completedAt: admin.firestore.FieldValue.serverTimestamp() });
  batch.update(db.doc(`businesses/${businessId}/services/${serviceId}`), { currentServing: num });
  await batch.commit();
  await notifyQueue(businessId, serviceId, num);
  return { num };
});

// Push to the customer being served + the one 2 away.
async function notifyQueue(businessId, serviceId, C) {
  const targets = [
    { n: C, title: "It's your turn! 🎉", tail: "please proceed to the counter." },
    { n: C + 2, title: "Almost your turn ⏰", tail: "you're 2 away." },
  ];
  for (const t of targets) {
    const qs = await db.collection("tokens")
      .where("businessId", "==", businessId)
      .where("serviceId", "==", serviceId)
      .where("numericValue", "==", t.n)
      .get();
    for (const d of qs.docs) {
      const data = d.data();
      if (!data.fcmToken) continue;
      try {
        await admin.messaging().send({
          token: data.fcmToken,
          notification: { title: t.title, body: `${data.number} — ${t.tail}` },
        });
      } catch (e) { /* stale token, ignore */ }
    }
  }
}

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

