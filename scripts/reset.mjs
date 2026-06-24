// Clears all tokens and resets every service to a fresh state (currentServing/lastIssued = 0).
// Emulator:  npm run reset
// Cloud:     GOOGLE_APPLICATION_CREDENTIALS=... SEED_TARGET=cloud SEED_PROJECT=waitless-online node scripts/reset.mjs
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const CLOUD = process.env.SEED_TARGET === "cloud";
if (!CLOUD) process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
initializeApp({ projectId: CLOUD ? (process.env.SEED_PROJECT || "waitless-online") : "demo-waitless" });
const db = getFirestore();

const toks = await db.collection("tokens").get();
let b = db.batch(); let i = 0;
for (const d of toks.docs) { b.delete(d.ref); if (++i % 400 === 0) { await b.commit(); b = db.batch(); } }
await b.commit();

const svcs = await db.collectionGroup("services").get();
let b2 = db.batch();
for (const d of svcs.docs) b2.update(d.ref, { currentServing: 0, lastIssued: 0 });
await b2.commit();

console.log(`✓ Cleared ${toks.size} tokens, reset ${svcs.size} services to fresh (start at #1)`);
process.exit(0);
