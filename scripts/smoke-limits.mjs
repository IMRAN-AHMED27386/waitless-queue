// Emulator smoke test: free-plan monthly limit, trial handling, waCode.
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-waitless";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

initializeApp({ projectId: "demo-waitless" });
const db = getFirestore();
const FN = "http://127.0.0.1:5001/demo-waitless/asia-south1";

async function call(name, data) {
  const r = await fetch(`${FN}/${name}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  return r.json();
}
const key = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
let pass = 0, fail = 0;
const check = (label, ok, extra = "") => { ok ? pass++ : fail++; console.log(`${ok ? "✅" : "❌"} ${label}${extra ? " — " + extra : ""}`); };

// Setup: one business with one service.
await db.doc("businesses/test-biz").set({ name: "Test Clinic", plan: "free", status: "active", alertHeadsUp: 10, alertComeNow: 3 });
await db.doc("businesses/test-biz/services/gen").set({ name: "General", prefix: "T", currentServing: 0, lastIssued: 0, avgMins: 5 });

// 1. Free plan under the limit → token issued, waCode present, counter counted.
let r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "A", phone: "1" });
check("free plan: token issued under limit", !!r.result?.number, r.result?.number || JSON.stringify(r));
const tok = (await db.collection("tokens").where("businessId", "==", "test-biz").limit(5).get()).docs[0]?.data();
check("token has 6-char waCode", /^[A-Z0-9]{6}$/.test(tok?.waCode || ""), tok?.waCode);
let biz = (await db.doc("businesses/test-biz").get()).data();
check("monthlyTokens counted with month key", biz.monthlyTokens === 1 && biz.tokensMonthKey === key, `count=${biz.monthlyTokens} key=${biz.tokensMonthKey}`);

// 2. Free plan AT the limit → rejected with resource-exhausted.
await db.doc("businesses/test-biz").update({ monthlyTokens: 1000, tokensMonthKey: key });
r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "B", phone: "2" });
check("free plan: 1001st token rejected", r.error?.status === "RESOURCE_EXHAUSTED", r.error?.status || JSON.stringify(r));

// 3. Same counts but ACTIVE TRIAL → allowed (trial = pro).
await db.doc("businesses/test-biz").update({ plan: "pro", status: "trial", trialEndsAt: Timestamp.fromMillis(Date.now() + 86400000) });
r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "C", phone: "3" });
check("active trial: unlimited tokens", !!r.result?.number, r.result?.number || JSON.stringify(r));

// 4. EXPIRED trial → treated as free → rejected at limit.
await db.doc("businesses/test-biz").update({ trialEndsAt: Timestamp.fromMillis(Date.now() - 86400000), monthlyTokens: 1000, tokensMonthKey: key });
r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "D", phone: "4" });
check("expired trial: rejected at free limit", r.error?.status === "RESOURCE_EXHAUSTED", r.error?.status || JSON.stringify(r));

// 5. New month → lazy reset lets tokens flow again (stale key, still status active+free).
await db.doc("businesses/test-biz").update({ plan: "free", status: "active", monthlyTokens: 1000, tokensMonthKey: "2020-01" });
r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "E", phone: "5" });
biz = (await db.doc("businesses/test-biz").get()).data();
check("new month: counter lazily reset", !!r.result?.number && biz.monthlyTokens === 1 && biz.tokensMonthKey === key, `count=${biz.monthlyTokens}`);

// 6. Suspended → rejected regardless of plan.
await db.doc("businesses/test-biz").update({ status: "suspended" });
r = await call("issueToken", { businessId: "test-biz", serviceId: "gen", name: "F", phone: "6" });
check("suspended business rejected", r.error?.status === "FAILED_PRECONDITION", r.error?.status);

// 7. WhatsApp webhook GET verification handshake.
const v = await fetch(`${FN}/whatsappWebhook?hub.mode=subscribe&hub.verify_token=waitless-verify&hub.challenge=12345`);
check("webhook GET verify echoes challenge", (await v.text()) === "12345");
const bad = await fetch(`${FN}/whatsappWebhook?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=x`);
check("webhook rejects wrong verify token", bad.status === 403);

// 8. Webhook POST with TRACK code links the WhatsApp number to the token.
const tk = (await db.collection("tokens").where("businessId", "==", "test-biz").get()).docs
  .map((d) => ({ id: d.id, ...d.data() })).find((t) => t.customerName === "E");
const post = await fetch(`${FN}/whatsappWebhook`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ type: "text", from: "9607771234", text: { body: `TRACK ${tk.waCode}` } }] } }] }] }),
});
const linked = (await db.doc(`tokens/${tk.id}`).get()).data();
check("webhook TRACK links waTo + opens window", post.status === 200 && linked.waTo === "9607771234" && !!linked.waWindowAt, `waTo=${linked.waTo}`);

// 9. onboardBusiness → new business starts on a 30-day Pro trial. (Needs auth — emulator functions accept unauthenticated? onCall requires req.auth → we can't easily fake; skip if unauthenticated error.)
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
